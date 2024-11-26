UIConstants.classFields({
	KILLED_BY_FONT_SIZE: 24 * devicePixelRatio,
	KILLED_BY_STROKE_WIDTH: 4 * devicePixelRatio,
	//ms
	KILLED_BY_POP_OUT_TIME: 2_500
});

/**
 * Sprite to show a "killed by" text message when someone on the
 * player's end, dies.
 * @param game Phaser game instance
 * @param gameController Game controller
 */
export default function UIKilledByGroup(game, gameController) {
	Phaser.Group.call(this, game, null);
	this.gameController = gameController;
	this.killedBy = this.addChild(new Phaser.Text(game, 0, 0, '0', {
		font: `${ UIConstants.KILLED_BY_FONT_SIZE }px TankTrouble`,
		fontWeight: 'bold',
		fill: '#ffffff',
		stroke: '#000000',
		strokeThickness: UIConstants.KILLED_BY_STROKE_WIDTH
	}));
	this.killedBy.anchor.setTo(0.5, 0.5);
	this.killedBy.kill();
	this.killerPlayerId = null;
	this.victimPlayerId = null;
	this.exists = false;
	this.visible = false;
}

UIKilledByGroup.prototype = Object.create(Phaser.Group.prototype);
UIKilledByGroup.prototype.constructor = UIKilledByGroup;
UIKilledByGroup.prototype.update = function() {};

UIKilledByGroup.prototype.postUpdate = function() {
	if (!this.exists)
		return;

	Phaser.Group.prototype.postUpdate.call(this);
};

UIKilledByGroup.prototype.spawn = function(x, y, killerPlayerId, victimPlayerId, animate) {
	this.exists = true;
	this.visible = true;
	this.x = x;
	this.y = y;
	this.killerPlayerId = killerPlayerId;
	this.victimPlayerId = victimPlayerId;
	this.killedBy.revive();
	this._setDeathMessage();

	if (this.removeTween) {
		this.removeTween.stop();
		this.removeTween = null;
	}
	if (animate) {
		this.scale.setTo(0.0, 0.0);
		this.spawnTween = this.game.add.tween(this.scale).to({
			x: UIConstants.ASSET_SCALE,
			y: UIConstants.ASSET_SCALE
		}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true);
	} else {
		this.scale.setTo(UIConstants.ASSET_SCALE, UIConstants.ASSET_SCALE);
	}

	setTimeout(() => this.remove(), UIConstants.KILLED_BY_POP_OUT_TIME);
};

UIKilledByGroup.prototype._setDeathMessage = function() {
	Backend.getInstance().getPlayerDetails(result => {
		if (typeof result === 'object') {
			const username = result.getUsername();
			const killedSelf = this.getKillerPlayerId() === this.getVictimPlayerId();

			if (killedSelf) this.killedBy.setText('Pwned yourself!');
			else this.killedBy.setText(`Killed by ${ username }!`);
		}
	}, () => {}, () => {}, this.getKillerPlayerId(), Caches.getPlayerDetailsCache());
};

UIKilledByGroup.prototype.getKillerPlayerId = function() {
	return this.killerPlayerId;
};

UIKilledByGroup.prototype.getVictimPlayerId = function() {
	return this.victimPlayerId;
};

UIKilledByGroup.prototype.remove = function() {
	if (this.spawnTween) {
		this.spawnTween.stop();
		this.spawnTween = null;
	}

	this.removeTween = this.game.add.tween(this.scale).to({
		x: 0,
		y: 0
	}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None, true);

	this.removeTween.onComplete.add(function() {
		this.killedBy.kill();
		this.killerPlayerId = null;
		this.victimPlayerId = null;
		this.exists = false;
		this.visible = false;
	}, this);
};

UIKilledByGroup.prototype.retire = function() {
	if (this.spawnTween) this.spawnTween.stop();

	this.killedBy.kill();
	this.killerPlayerId = null;
	this.victimPlayerId = null;
	this.exists = false;
	this.visible = false;
};