/**
 * Creates new tank placeholder icon sprite
 * @param game Phaser.Game
 * @param size Icon size
 */
export default function UIPlaceholderIconImage(game, size) {
	this.iconWidth = 0;
	this.iconHeight = 0;
	this.size = size;
	switch (this.size) {
		case UIConstants.TANK_ICON_SIZES.SMALL:
		{
			this.iconWidth = UIConstants.TANK_ICON_WIDTH_SMALL;
			this.iconHeight = UIConstants.TANK_ICON_HEIGHT_SMALL;
			break;
		}
		case UIConstants.TANK_ICON_SIZES.MEDIUM:
		{
			this.iconWidth = UIConstants.TANK_ICON_WIDTH_MEDIUM;
			this.iconHeight = UIConstants.TANK_ICON_HEIGHT_MEDIUM;
			break;
		}
		case UIConstants.TANK_ICON_SIZES.LARGE:
		{
			this.iconWidth = UIConstants.TANK_ICON_WIDTH_LARGE;
			this.iconHeight = UIConstants.TANK_ICON_HEIGHT_LARGE;
			break;
		}
		default:
		{
			throw new Error('No size passed to UIPlaceholderIconImage');
		}
	}
	Phaser.Image.call(this, game, 0, 0, `tankiconplaceholderaddons-${ this.size }`);
	this.anchor.setTo(0.5, 0.5);
	this.spawnTween = null;
	this.removeTween = null;
	this.updateHideTween = null;
	this.updateShowTween = null;
	this.kill();
	this.scale.set(0.0, 0.0);
	this.log = Log.create('UIPlaceholderIconImage');
}

UIPlaceholderIconImage.prototype = Object.create(Phaser.Image.prototype);
UIPlaceholderIconImage.prototype.constructor = UIPlaceholderIconImage;

UIPlaceholderIconImage.prototype.update = function() {};

UIPlaceholderIconImage.prototype.spawn = function(x, y, flipped, animate, targetScale = 1.0) {
	this.reset(x, y);
	this.scale.set(0.0, 0.0);
	this.exists = true;
	this.visible = true;
	this.flipped = flipped;
	this.targetScale = targetScale;

	const delay = 50 + Math.random() * 200;
	if (this.removeTween) {
		this.removeTween.stop();
		this.removeTween = null;
	}

	if (animate) {
		this.spawnTween = this.game.add.tween(this.scale).to({
			x: (this.flipped ? -this.targetScale : this.targetScale),
			y: this.targetScale
		}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true, delay);
	} else {
		this.scale.set((this.flipped ? -this.targetScale : this.targetScale), this.targetScale);
	}
};

UIPlaceholderIconImage.prototype.remove = function() {
	this.showingDetails = false;

	if (this.spawnTween) this.spawnTween.stop();

	if (this.updateHideTween) this.updateHideTween.stop();

	if (this.updateShowTween) this.updateShowTween.stop();

	this.removeTween = this.game.add.tween(this.scale).to({
		x: 0.0,
		y: 0.0
	}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None, true);
	this.removeTween.onComplete.add(function() {
		this.removeTween = null;
		this.kill();
	}, this);
};

UIPlaceholderIconImage.prototype.retire = function() {
	this.kill();
};

export const _isESmodule = true;
