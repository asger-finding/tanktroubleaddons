import { dispatchMessage } from '../common/ipcBridge.js';

/**
 * Create full screen toggle game button
 * @param {Phaser.Game} game Phaser game instance
 * @param {number} x x pixel position
 * @param {number} y y pixel position
 */
export default function UIFullscreenGameButtonGroup(game, x, y) {
	// Call super.
	Phaser.Group.call(this, game, null);
	this.x = x;
	this.y = y;

	this.scale.setTo(0.0);

	this.fullscreenGroup = this.addChild(new UIButtonGroup(game, 0, 0, '', UIConstants.BUTTON_SIZES.MEDIUM, '⛶', this._toggleFullscreen, this, 0));

	// Make icon bold.
	this.fullscreenGroup.buttonText.addFontWeight('bold', 0);

	this.removeTween = null;
	this.openTween = null;
	this.closeTween = null;

	this.exists = false;
	this.visible = false;
}

UIFullscreenGameButtonGroup.prototype = Object.create(Phaser.Group.prototype);
UIFullscreenGameButtonGroup.prototype.constructor = UIFullscreenGameButtonGroup;

UIFullscreenGameButtonGroup.prototype._toggleFullscreen = function() {
	dispatchMessage(null, {
		type: 'FULLSCREEN',
		data: {
			state: document.documentElement.classList.contains('fullscreen') ? 'off' : 'on'
		}
	});
	document.documentElement.classList.toggle(
		'fullscreen',
		!document.documentElement.classList.contains('fullscreen')
	);
	ResizeManager._resize();
};

UIFullscreenGameButtonGroup.prototype._unfullscreen = function() {
	dispatchMessage(null, {
		type: 'FULLSCREEN',
		data: { state: 'off' }
	});
	document.documentElement.classList.remove('fullscreen');
	ResizeManager._resize();
};

UIFullscreenGameButtonGroup.prototype.spawn = function() {
	this.exists = true;
	this.visible = true;
	this.fullscreenGroup.spawn();
	this.fullscreenGroup.enableInput();

	if (this.removeTween) this.removeTween.stop();

	this.game.add.tween(this.scale).to({ x: 1, y: 1 }, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true);
};

UIFullscreenGameButtonGroup.prototype.update = function() {
	if (!this.exists) return;

	// Call super.
	Phaser.Group.prototype.update.call(this);
};

UIFullscreenGameButtonGroup.prototype.postUpdate = function() {
	if (!this.exists) return;

	// Call super.
	Phaser.Group.prototype.postUpdate.call(this);
};

UIFullscreenGameButtonGroup.prototype.remove = function() {
	this.fullscreenGroup.disableInput();

	this.removeTween = this.game.add.tween(this.scale).to({ x: 0.0, y: 0.0 }, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None, true);
	this.removeTween.onComplete.add(
		function() {
			// Kill the button.
			this.exists = false;
			this.visible = false;

			// Unfullscreen the user
			this._unfullscreen();
		},
		this
	);
};

UIFullscreenGameButtonGroup.prototype.retire = function() {
	// Kill the button.
	this.exists = false;
	this.visible = false;

	// Unfullscreen the user
	this._unfullscreen();
};
