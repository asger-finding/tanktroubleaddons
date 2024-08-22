UIConstants.GAME_ICON_POOL_SIZE = 6;
UIConstants.GAME_ICON_COUNT = 6;
UIConstants.GAME_ICON_WIDTH /= 1.9;
UIConstants.GAME_ICON_HEIGHT /= 1.9;

UIGameIconImage.prototype.spawn = function(x, y, gameState, favouriteActiveQueuedCounts) {
	this.reset(x, y);
	this.gameId = gameState.getId();
	this.mode = gameState.getMode();
	this.ranked = gameState.getRanked();
	this.playerStates = gameState.getPlayerStates();
	this.favouriteActiveQueuedCounts = favouriteActiveQueuedCounts;
	this._updateUI();
	const delay = 50 + (Math.random() * 200);
	if (this.removeTween) this.removeTween.stop();

	this.game.add.tween(this.scale).to({
		x: UIConstants.ASSET_SCALE / 1.9,
		y: UIConstants.ASSET_SCALE / 1.9
	}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true, delay);
};
