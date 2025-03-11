import UIFullscreenGameButtonGroup from './uifullscreengamebuttongroup.js';

UIConstants.classFields({
	FULLSCREEN_GAME_MARGIN_X: 68 * devicePixelRatio,
	FULLSCREEN_GAME_MARGIN_Y: 28 * devicePixelRatio
});

Game.UIGameState.field('fullscreenGameGroup', null);

/**
 * Override leave game button to modify scale tween to match fullscreen button scale
 */
UILeaveGameButtonGroup.prototype.spawn = function() {
	this.exists = true;
	this.visible = true;
	this.leaveGameGroup.spawn();
	this.leaveGameGroup.enableInput();

	if (this.removeTween) this.removeTween.stop();

	this.game.add.tween(this.scale).to({ x: 1, y: 1 }, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true);
};

/**
 * Inject fullscreen button group to game state
 */
const createGameState = Game.UIGameState.getMethod('create');
Game.UIGameState.method('create', function(...args) {
	const result = createGameState.apply(this, ...args);

	// Insert group before leave game button so that
	// it doesn't overlay the leaving game text
	this.fullscreenGameGroup = this.overlayGroup.addChildAt(new UIFullscreenGameButtonGroup(this.game, this.game.width - UIConstants.FULLSCREEN_GAME_MARGIN_X, UIConstants.FULLSCREEN_GAME_MARGIN_Y), 0);
	this.fullscreenGameGroup.spawn();

	return result;
});

/**
 * Also retire fullscreen button group alongside rest
 */
const retireUI = Game.UIGameState.getMethod('_retireUI');
Game.UIGameState.method('_retireUI', function(...args) {
	this.fullscreenGameGroup.retire();

	return retireUI.apply(this, ...args);
});

/**
 * Position fullscreen button on resize
 */
const gameResizeHandler = Game.UIGameState.getMethod('_onSizeChangeHandler');
Game.UIGameState.method('_onSizeChangeHandler', function(...args) {
	const result = gameResizeHandler.apply(this, ...args);

	this.fullscreenGameGroup.position.x = this.game.width - UIConstants.FULLSCREEN_GAME_MARGIN_X;

	return result;
});

export const _isESmodule = true;
