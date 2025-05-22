import ProxyHelper from '../utils/proxyHelper.js';
import UIFullscreenGameButtonGroup from './uifullscreengamebuttongroup.js';

UIConstants.classFields({
	FULLSCREEN_GAME_MARGIN_X: 68 * (devicePixelRatio > 1 ? devicePixelRatio : 1),
	FULLSCREEN_GAME_MARGIN_Y: 28 * (devicePixelRatio > 1 ? devicePixelRatio : 1)
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

ProxyHelper.interceptFunction(Game.UIGameState, 'create', function(original, ...args) {
	const result = original(...args);

	// Insert group before leave game button so that
	// it doesn't overlay the leaving game text
	this.fullscreenGameGroup = this.overlayGroup.addChildAt(
		new UIFullscreenGameButtonGroup(
			this.game,
			this.game.width - UIConstants.FULLSCREEN_GAME_MARGIN_X,
			UIConstants.FULLSCREEN_GAME_MARGIN_Y
		), 0);
	this.fullscreenGameGroup.spawn();

	return result;
}, { isClassy: true });

/** Retire the fullscreen group */
ProxyHelper.interceptFunction(Game.UIGameState, '_retireUI', function(original, ...args) {
	this.fullscreenGameGroup.retire();

	original(...args);
}, { isClassy: true });


/** Position fullscreen button on resize */
ProxyHelper.interceptFunction(Game.UIGameState, '_onSizeChangeHandler', function(original, ...args) {
	const result = original(...args);
	this.fullscreenGameGroup.position.x = this.game.width - UIConstants.FULLSCREEN_GAME_MARGIN_X;
	return result;
}, { isClassy: true });

export const _isESmodule = true;
