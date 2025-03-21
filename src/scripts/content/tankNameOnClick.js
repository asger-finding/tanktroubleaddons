/**
 * Show tank usernames below their name when clicked in-game.
 */
const createUIGameState = Game.UIGameState.getMethod('create');
Game.UIGameState.method('create', function(...args) {
	createUIGameState.apply(this, args);

	this.tankGroup.inputEnableChildren = true;
	this.tankGroup.setAllChildren('inputEnabled', true);

	/**
	 * Handle Phaser mouseup event to show username
	 * @param signal Tank sprite
	 * @param signal.playerId Tank playerId attribute
	 */
	const onMouseUp = ({ playerId: target }) => {
		const boundToTank = this.tankNameGroup.children.filter(({ playerId }) => playerId === target);
		for (const tankNameSprite of boundToTank) tankNameSprite.retire();

		const tankNameSprite = this.tankNameGroup.getFirstExists(false);
		if (target && tankNameSprite) tankNameSprite.spawn(target);
	};

	this.tankGroup.onChildInputUp.add(onMouseUp, this);

});

export const _isESmodule = true;
