import UIPlaceholderIconImage from './uiplaceholdericonimage.js';

// TODO: add garage-like arrow scroller instead

/**
 * @typedef {object} Polygon
 * @property {number} x Title for the section
 * @property {number} y Unique id for the section
 * @property {boolean} flipped Does the site need to reload for the change to take effect?
 */

/**
 * Rounds a float to the nearest decimal point `precision`
 * @param {number} value Value to round
 * @param {number} precision Integer: decimals to round to
 * @returns {number} Rounded float
 */
const roundToPrecision = (value, precision = 6) => {
	const factor = Math.pow(10, precision);
	return Math.round(value * factor) / factor;
};

/**
 * Generate a polygon with n amount of points and transform it as given
 * @param points Amount of points to add
 * @param width Width of the returned polygon
 * @param height Height of the returned polygon
 * @param rotation Rotation translation
 * @returns {Polygon} New polygon
 */
const createPolygon = (points, width = 1, height = 1, rotation = Math.PI / points + Math.PI / 2) => {
	const vertices = [];

	for (let i = 0; i < points; i++) {
		const angle = (i * (2 * Math.PI / points)) + rotation;
		const x = Math.cos(angle);
		const y = Math.sin(angle);
		vertices.push([x, y]);
	}

	// Find the min and max for both x and y
	const xValues = vertices.map(([x]) => x);
	const yValues = vertices.map(([, y]) => y);

	const minX = Math.min(...xValues);
	const maxX = Math.max(...xValues);
	const minY = Math.min(...yValues);
	const maxY = Math.max(...yValues);

	const normalizedVertices = vertices.map(([x, y]) => {
		const normalizedX = (x - minX) / (maxX - minX);
		const normalizedY = (y - minY) / (maxY - minY);
		return {
			x: roundToPrecision(normalizedX * width, 6),
			y: roundToPrecision(normalizedY * height, 6),
			flipped: normalizedX > 0.5
		};
	});

	return normalizedVertices;
};

UIConstants.GAME_ICON_TANK_COUNT = UIConstants.TANK_POOL_SIZE;
UIConstants.GAME_ICON_POOL_SIZE = 6;
UIConstants.GAME_ICON_COUNT = 6;
UIConstants.GAME_ICON_WIDTH /= 1.9;
UIConstants.GAME_ICON_HEIGHT /= 1.9;

UIGameIconImage = function(game) {
	Phaser.Image.call(this, game, 0, 0, 'gameicon');
	this.anchor.setTo(0.5, 0.5);
	this.gameModeIcon = this.addChild(new Phaser.Sprite(this.game, 0, 0, 'gamemodeicon'));
	this.gameModeIcon.anchor.setTo(0.5, 0.5);
	this.iconsScale = 1.0;
	this.icons = [];

	this.tankPlaceholderGroup = this.game.add.group(this);
	for (let i = 0; i < UIConstants.GAME_ICON_TANK_COUNT; ++i)
		this.tankPlaceholderGroup.add(new UIPlaceholderIconImage(this.game, UIConstants.TANK_ICON_SIZES.SMALL));

	this.tankIconGroup = this.game.add.group(this);
	for (let i = 0; i < UIConstants.GAME_ICON_TANK_COUNT; ++i)
		this.tankIconGroup.add(new UITankIconImage(this.game, true, UIConstants.TANK_ICON_SIZES.SMALL));

	this.tankNameGroup = this.game.add.group(this);
	for (let i = 0; i < UIConstants.GAME_ICON_TANK_COUNT; ++i)
		this.tankNameGroup.add(new UITankIconNameGroup(this.game, UIConstants.TANK_ICON_WIDTH_SMALL, true));

	this.removeTween = null;
	this.scale.set(0.0, 0.0);
	this.kill();
	this.log = Log.create('UIGameIconImage');
};

UIGameIconImage.prototype = Object.create(Phaser.Image.prototype);
UIGameIconImage.prototype.constructor = UIGameIconImage;
UIGameIconImage.prototype.update = function() {
	if (!this.exists)
		return;

	for (const icon in this.icons) {
		icon.name?.update();
		icon.icon?.update();
	}
};

UIGameIconImage.prototype.getTankIcons = function() {
	return this.icons.reduce((acc, { playerId, icon, name, placement }) => {
		if (playerId !== null) acc.push({ icon, name, placement });
		return acc;
	}, []);
};

UIGameIconImage.prototype.spawn = function(x, y, gameState, favouriteActiveQueuedCounts) {
	this.reset(x, y);
	this.gameId = gameState.getId();
	this.mode = gameState.getMode();
	this.ranked = gameState.getRanked();
	this.playerStates = gameState.getPlayerStates();
	this.iconPlacements = createPolygon(gameState.getMaxActivePlayerCount(), 280, 190);
	this.favouriteActiveQueuedCounts = favouriteActiveQueuedCounts;
	this._updateUI();
	const delay = 50 + (Math.random() * 200);
	if (this.removeTween) this.removeTween.stop();

	this.game.add.tween(this.scale).to({
		x: UIConstants.ASSET_SCALE / 1.7,
		y: UIConstants.ASSET_SCALE / 1.7
	}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true, delay);
};

UIGameIconImage.prototype.refresh = function(gameState, favouriteActiveQueuedCounts) {
	this.mode = gameState.getMode();
	this.ranked = gameState.getRanked();
	this.playerStates = gameState.getPlayerStates();
	this.iconPlacements = createPolygon(gameState.getMaxActivePlayerCount(), 280, 190);
	this.favouriteActiveQueuedCounts = favouriteActiveQueuedCounts;
	this._updateUI();
};

UIGameIconImage.prototype.addPlaceholder = function(placement) {
	const tankPlaceholderSprite = this.tankPlaceholderGroup.getFirstExists(false);
	if (tankPlaceholderSprite) {
		this.icons.push({
			playerId: null,
			icon: tankPlaceholderSprite,
			name: null,
			placement
		});

		tankPlaceholderSprite.spawn(placement.x - 140, placement.y - 120, placement.flipped, true, this.iconsScale);
	}
};

// eslint-disable-next-line complexity
UIGameIconImage.prototype._updateUI = function() {
	const iconFrame = UIConstants.GAME_MODE_NAME_INFO[this.mode].ICON;
	if (iconFrame < 0) {
		this.gameModeIcon.visible = false;
	} else {
		this.gameModeIcon.frame = iconFrame;
		this.gameModeIcon.visible = true;
	}

	this.iconsScale = this.iconPlacements.length <= 4
		? 1
		: Math.exp(-0.4 * (this.iconPlacements.length - 5));

	const shift = this.icons.length;
	for (let i = 0; i < this.iconPlacements.length - shift; i++)
		this.addPlaceholder(this.iconPlacements[i + shift]);

	for (let i = 0; i < this.icons.length; i++) {
		const icon = this.icons[i];
		if (icon.playerId === null) continue;

		const tankStillInGame = this.playerStates.some(playerState => icon.playerId === playerState.getPlayerId());
		if (!tankStillInGame) {
			for (let j = i; j < this.iconPlacements.length; j++) {
				this.icons[j].icon?.remove();
				this.icons[j].name?.remove();
			}

			this.icons.splice(i);

			for (let j = this.icons.length; j < this.iconPlacements.length; j++)
				this.addPlaceholder(this.iconPlacements[j]);
		}
	}

	for (let i = 0; i < this.playerStates.length; i++) {
		const playerState = this.playerStates[i];

		const alreadyExists = this.icons.find(icon => icon.playerId === playerState.getPlayerId());
		if (alreadyExists) {
			alreadyExists.icon.refresh();
			// The function checks against literal undefined
			// eslint-disable-next-line no-undefined
			alreadyExists.name.refresh(undefined, undefined, undefined, this.ranked);

			continue;
		}

		// Instantiate tank icon
		const tankIconSprite = this.tankIconGroup.getFirstExists(false);
		const tankNameSprite = this.tankNameGroup.getFirstExists(false);

		if (tankIconSprite && tankNameSprite) {
			const avaliablePosition = this.icons.findIndex(({ playerId }) => playerId === null);
			if (avaliablePosition === -1) continue;

			const placement = this.iconPlacements[avaliablePosition];

			this.icons[avaliablePosition].icon.remove();
			this.icons.splice(avaliablePosition, 1, {
				playerId: playerState.getPlayerId(),
				icon: tankIconSprite,
				name: tankNameSprite,
				placement
			});

			tankIconSprite.spawn(placement.x - 140, placement.y - 120, playerState.getPlayerId(), placement.flipped, true, this.iconsScale);
			tankNameSprite.spawn(placement.x - 140, placement.y - (40 * (1 / this.iconsScale)), playerState.getPlayerId(), this.iconsScale, this.ranked);
		}
	}
};

UIGameIconImage.prototype.remove = function() {
	this.removeTween = this.game.add.tween(this.scale).to({
		x: 0.0,
		y: 0.0
	}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None, true);
	this.removeTween.onComplete.add(function() {
		this.kill();
	}, this);
	this.tankPlaceholderGroup.callAll('remove');
	this.tankIconGroup.callAll('remove');
	this.tankNameGroup.callAll('remove');
	this.tankIcons = {};
	this.icons = [];
};

UIGameIconImage.prototype.retire = function() {
	this.kill();
	this.tankPlaceholderGroup.callAll('retire');
	this.tankIconGroup.callAll('retire');
	this.tankNameGroup.callAll('retire');
};

export const _isESmodule = true;
