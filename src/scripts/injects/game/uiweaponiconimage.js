//FIXME See if this can be ported to Classy.
UIWeaponIconImage = function(game)
{
    // Call super.
    Phaser.Image.call(this, game, 0, 0, 'game', 'crate0-0');
        
    this.anchor.set(0.5, 0.5);
    this.alpha = 0.7;

    this.removeTween = null;

    // State.
    this.theme = 0;
    this.contentFrame = 0;

    // Disable icon.
    this.kill();
    this.scale.set(0.0, 0.0); 

    // Create log.
    this.log = Log.create('UIWeaponIconImage');
};

UIWeaponIconImage.prototype = Object.create(Phaser.Image.prototype);
UIWeaponIconImage.prototype.constructor = UIWeaponIconImage;

UIWeaponIconImage.prototype.setTheme = function(theme) {
    this.theme = theme;
    this.frameName = 'crate' + this.theme + '-' + this.contentFrame
};

UIWeaponIconImage.prototype.update = function()
{
};

UIWeaponIconImage.prototype.spawn = function(x, y, scale, contentFrame)
{
    // Store contentFrame.
    this.contentFrame = contentFrame;

    // Revive and place the sprite.
    this.reset(x, y);
    this.frameName = 'crate' + this.theme + '-' + this.contentFrame;
    
    if (this.removeTween) {
        this.removeTween.stop();
    }
    this.game.add.tween(this.scale).to({x: scale, y: scale}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true);

};

UIWeaponIconImage.prototype.refresh = function(x, scale)
{
    this.game.add.tween(this).to({x: x}, UIConstants.ELEMENT_MOVE_TIME, Phaser.Easing.Quadratic.InOut, true);
    this.game.add.tween(this.scale).to({x: scale, y: scale}, UIConstants.ELEMENT_MOVE_TIME, Phaser.Easing.Quadratic.InOut, true);
};

UIWeaponIconImage.prototype.remove = function()
{
    this.removeTween = this.game.add.tween(this.scale).to({x: 0.0, y: 0.0}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None, true);
    this.removeTween.onComplete.add(
        function() {
            // Kill the sprite.
            this.kill();
        },
        this
    );
};

UIWeaponIconImage.prototype.retire = function()
{
    // Kill the sprite.
    this.kill();
};
