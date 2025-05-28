import UIPlaceholderIconImage from './uiplaceholdericonimage.js';
import { createPolygon } from '../utils/mathUtils.js';

const resolutionScale = UIUtils.getLoadedAssetResolutionScale(devicePixelRatio);

/**
 * Create game icon image for the lobby with variable tank seats
 * @param {Phaser.Game} game Phaser game instance
 */
export default function UIGameIconImage(game) {
	Phaser.Image.call(this, game, 0, 0, 'gameicon');
	this.anchor.setTo(0.5, 0.5);
	this.gameModeIcon = this.addChild(new Phaser.Sprite(this.game, 0, 0, 'gamemodeicon'));
	this.gameModeIcon.anchor.setTo(0.5, 0.5);
	this.iconsScale = 1.0;
	this.icons = [];

	this.tankPlaceholderGroup = this.game.add.group(this);
	this.tankIconGroup = this.game.add.group(this);
	this.tankNameGroup = this.game.add.group(this);
	for (let i = 0; i < UIConstants.GAME_ICON_TANK_COUNT; ++i) {
		this.tankPlaceholderGroup.add(new UIPlaceholderIconImage(this.game, UIConstants.TANK_ICON_SIZES.SMALL));
		this.tankIconGroup.add(new UITankIconImage(this.game, true, UIConstants.TANK_ICON_SIZES.SMALL));
		this.tankNameGroup.add(new UITankIconNameGroup(this.game, UIConstants.TANK_ICON_WIDTH_SMALL, true));
	}

	this.gameButton = this.addChild(new UIGameButtonGroup(this.game, null, null, true));

	this.removeTween = null;
	this.scale.set(0.0, 0.0);
	this.kill();
	this.log = Log.create('UIGameIconImage');
}

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

// eslint-disable-next-line max-params
UIGameIconImage.prototype.spawn = function(x, y, gameState, favouriteActiveQueuedCounts, joinGameCb, lobbyCtx) {
	this.reset(x, y);
	this.gameId = gameState.getId();
	this.mode = gameState.getMode();
	this.ranked = gameState.getRanked();
	this.playerStates = gameState.getPlayerStates().sort((first, sec) => first.getQueued() - sec.getQueued());
	this.iconPlacements = createPolygon(gameState.getMaxActivePlayerCount(), 140 * resolutionScale, 95 * resolutionScale);
	this.favouriteActiveQueuedCounts = favouriteActiveQueuedCounts;
	this._updateUI();

	if (this.removeTween) this.removeTween.stop();

	this.gameButton.joinGameCb = joinGameCb;
	this.gameButton.joinGameCbContext = lobbyCtx;
	this.gameButton.spawn(0, UIConstants.GAME_ICON_JOIN_GAME_BUTTON_Y, gameState, favouriteActiveQueuedCounts, !lobbyCtx.joiningGame);

	const delay = 50 + (Math.random() * 200);
	this.game.add.tween(this.scale).to({
		x: UIConstants.ASSET_SCALE,
		y: UIConstants.ASSET_SCALE
	}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true, delay);
};

UIGameIconImage.prototype.refresh = function(gameState, favouriteActiveQueuedCounts) {
	this.mode = gameState.getMode();
	this.ranked = gameState.getRanked();
	this.playerStates = gameState.getPlayerStates();
	this.iconPlacements = createPolygon(gameState.getMaxActivePlayerCount(), 140 * resolutionScale, 95 * resolutionScale);
	this.favouriteActiveQueuedCounts = favouriteActiveQueuedCounts;
	this._updateUI();
};

UIGameIconImage.prototype._addPlaceholder = function(placement) {
	const tankPlaceholderSprite = this.tankPlaceholderGroup.getFirstExists(false);
	if (tankPlaceholderSprite) {
		this.icons.push({
			playerId: null,
			icon: tankPlaceholderSprite,
			name: null,
			placement
		});

		tankPlaceholderSprite.spawn(placement.x - 70 * resolutionScale, placement.y - 60 * resolutionScale, placement.flipped, true, this.iconsScale);
	}
};

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
		: Math.exp(-0.1 * (this.iconPlacements.length - 2));

	const shift = this.icons.length;
	for (let i = 0; i < this.iconPlacements.length - shift; i++) this._addPlaceholder(this.iconPlacements[i + shift]);

	for (let i = 0; i < this.icons.length; i++) {
		const icon = this.icons[i];
		if (icon.playerId === null) continue;

		const tankStillInGame = this.playerStates.some(playerState => icon.playerId === playerState.getPlayerId());
		if (!tankStillInGame) {
			for (let j = i; j < this.iconPlacements.length; j++) {
				if (!this.icons[j]) continue;

				this.icons[j].icon?.remove();
				this.icons[j].name?.remove();
			}

			this.icons.splice(i);

			for (let j = this.icons.length; j < this.iconPlacements.length; j++) this._addPlaceholder(this.iconPlacements[j]);
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

			tankIconSprite.spawn(placement.x - 70 * resolutionScale, placement.y - 60 * resolutionScale, playerState.getPlayerId(), placement.flipped, true, this.iconsScale);
			tankNameSprite.spawn(placement.x - 70 * resolutionScale, placement.y - (20 * resolutionScale * (1 / this.iconsScale)), playerState.getPlayerId(), this.iconsScale, this.ranked);
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
