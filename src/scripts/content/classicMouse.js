import { StoreEvent, get, onStateChange } from '../common/store.js';

let isClassicMouse = false;

/**
 * Set the classic mouse option
 * @param option Is classic mouse enabled?
 */
const setClassicMouse = option => {
	isClassicMouse = option === true;
};

// Initialize classicMouse setting
get('classicMouse').then(setClassicMouse);

// Handle state changes
onStateChange(({ detail }) => {
	if (
		detail?.type === StoreEvent.STORE_CHANGE &&
		typeof detail.data?.curr?.classicMouse !== 'undefined'
	) setClassicMouse(detail.data.curr.classicMouse);
});

UIConstants.classField('CLASSIC_MOUSE_INPUT', {
	ROTATION_DEAD_ANGLE: 0.1,
	POSITION_DEAD_DISTANCE: 180
});

// eslint-disable-next-line complexity
MouseInputManager.method('update', function() {
	this._super();

	const game = GameManager.getGame();
	if (!game || !game.state.getCurrentState().getTankSprite) return;

	const gameBounds = game.scale.bounds;
	const gameScale = game.scale.scaleFactor;
	this.mouseX = (MouseInputManager.mousePageX - gameBounds.x) * gameScale.x;
	this.mouseY = (MouseInputManager.mousePageY - gameBounds.y) * gameScale.y;

	if (!game.input.enabled || !MouseInputManager.mouseActivated) return;

	let forwardState = false;
	let backState = false;
	let leftState = [false, 1.0];
	let rightState = [false, 1.0];
	let fireState = false;

	const tankSprite = game.state.getCurrentState().getTankSprite(this.playerId);
	if (!tankSprite) return;

	const relativeToTank = tankSprite.toLocal(new Phaser.Point(this.mouseX, this.mouseY));
	const magnitude = relativeToTank.getMagnitude();
	let angle = Phaser.Math.angleBetween(0, 0, relativeToTank.x, relativeToTank.y);

	if (isClassicMouse) {
		if (angle > Math.PI / 2) angle = -angle;
		const distance = Math.abs((angle / Math.PI) + 0.5);
		const rotationMultiplier = distance > 0.1
			? Math.max(Math.min(distance * 12, 4), 1)
			: 1;

		rightState = [angle + (Math.PI * 0.5) > UIConstants.CLASSIC_MOUSE_INPUT.ROTATION_DEAD_ANGLE, rotationMultiplier];
		leftState = [angle + (Math.PI * 0.5) < -UIConstants.CLASSIC_MOUSE_INPUT.ROTATION_DEAD_ANGLE, rotationMultiplier];

		forwardState = magnitude > UIConstants.CLASSIC_MOUSE_INPUT.POSITION_DEAD_DISTANCE / UIConstants.GAME_ASSET_SCALE;
		backState = false;
	} else {
		const canReverse = magnitude < UIConstants.MOUSE_INPUT.MAX_REVERSE_DISTANCE / UIConstants.GAME_ASSET_SCALE;
		let goInReverse = false;
		if (angle > Math.PI * 0.5 + UIConstants.MOUSE_INPUT.ROTATION_DEAD_ANGLE || angle < -Math.PI * 0.5 - UIConstants.MOUSE_INPUT.ROTATION_DEAD_ANGLE) {
			if (angle > 0 && canReverse) {
				rightState = [true, 1.0];
				goInReverse = true;
			} else {
				leftState = [true, 1.0];
			}
		} else if (angle > -Math.PI * 0.5 + UIConstants.MOUSE_INPUT.ROTATION_DEAD_ANGLE && angle < Math.PI * 0.5 - UIConstants.MOUSE_INPUT.ROTATION_DEAD_ANGLE) {
			if (angle > 0 && canReverse) {
				leftState = [true, 1.0];
				goInReverse = true;
			} else {
				rightState = [true, 1.0];
			}
		} else if (angle > 0) {
			if (canReverse)
				goInReverse = true;
			else if (angle > Math.PI * 0.5)
				leftState = [true, 1.0];
			else
				rightState = [true, 1.0];

		}
		if (magnitude > UIConstants.MOUSE_INPUT.POSITION_DEAD_DISTANCE / UIConstants.GAME_ASSET_SCALE) {
			if (canReverse) {
				forwardState = !goInReverse;
				backState = goInReverse;
			} else if (angle > -Math.PI * 0.5 - UIConstants.MOUSE_INPUT.POSITION_DEAD_ANGLE && angle < -Math.PI * 0.5 + UIConstants.MOUSE_INPUT.POSITION_DEAD_ANGLE) {
				forwardState = true;
			}
		}
	}

	fireState ||= MouseInputManager.mouseDown || game.input.mousePointer.leftButton.isDown;

	let stateChanged = false;
	stateChanged ||= this.storedStates.forward !== forwardState;
	stateChanged ||= this.storedStates.back !== backState;
	stateChanged ||= this.storedStates.fire !== fireState;
	stateChanged ||= !leftState.every((el, i) => this.storedStates.left[i] === el);
	stateChanged ||= !rightState.every((el, i) => this.storedStates.right[i] === el);
	stateChanged ||= leftState[1] < 0.8 || leftState[1] > 1.2 || !isClassicMouse;
	stateChanged ||= rightState[1] < 0.8 || rightState[1] > 1.2 || !isClassicMouse;

	const gameController = GameManager.getGameController();
	if (stateChanged && gameController) {
		const inputState = InputState.withState(this.playerId, forwardState, backState, leftState, rightState, fireState);
		gameController.setInputState(inputState);
	}

	this.storedStates.forward = forwardState;
	this.storedStates.back = backState;
	this.storedStates.left = leftState;
	this.storedStates.right = rightState;
	this.storedStates.fire = fireState;
});

Tank.method('setTankState', function(tankState) {
	this.playerId = tankState.getPlayerId();
	this.x = tankState.getX();
	this.y = tankState.getY();
	this.forward = tankState.getForward();
	this.back = tankState.getBack();
	this.rotation = tankState.getRotation();
	this.fireDown = tankState.getFireDown();
	this.locked = tankState.getLocked();

	const left = tankState.getLeft();
	const right = tankState.getRight();
	[this.left, this.rotationSpeedMultiplier] = Array.isArray(left) ? left : [left, 1.0];
	[this.right, this.rotationSpeedMultiplier] = Array.isArray(right) ? right : [right, 1.0];

	if (this.b2dbody) {
		this.b2dbody.SetPosition(Box2D.Common.Math.b2Vec2.Make(this.x, this.y));
		this.b2dbody.SetAngle(this.rotation);

		this.update();
	}
});

Tank.method('update', function() {
	this.x = this.b2dbody.GetPosition().x;
	this.y = this.b2dbody.GetPosition().y;
	this.rotation = this.b2dbody.GetAngle();
	if (this.locked) {
		this.b2dbody.SetLinearVelocity(Box2D.Common.Math.b2Vec2.Make(0.0, 0.0));
		this.b2dbody.SetAngularVelocity(0.0);
	} else {
		this._computeSpeed();
		this._computeRotationSpeed();
		const speedX = Math.sin(this.rotation) * this.speed;
		const speedY = -Math.cos(this.rotation) * this.speed;
		this.b2dbody.SetLinearVelocity(Box2D.Common.Math.b2Vec2.Make(speedX, speedY));
		this.b2dbody.SetAngularVelocity(this.rotationSpeed * (this.rotationSpeedMultiplier || 1));
	}
});

export const _isESmodule = true;
