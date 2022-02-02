//FIXME See if this can be ported to Classy.
UIDiamondSprite = function(game, gameController, shineGroup, sparkleGroup)
{
    // Call super.
    Phaser.Sprite.call(this, game, 0, 0, 'game', 'diamond');

    this.anchor.setTo(0.5, 0.5);

    this.gameController = gameController;
    this.shineGroup = shineGroup;
    this.sparkleGroup = sparkleGroup;

    this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);

    this.diamondShine = null;

    this.sparkleIntervalTime = 0.0;

    // Disable diamond.
    this.kill();
};

UIDiamondSprite.prototype = Object.create(Phaser.Sprite.prototype);
UIDiamondSprite.prototype.constructor = UIDiamondSprite;

UIDiamondSprite.prototype.update = function()
{
    // Check if exists or game is frozen.
    if (!this.exists || this.game.physics.arcade.isPaused) {
        return false;
    }

    this.sparkleIntervalTime -= this.game.time.delta;

    if (this.sparkleIntervalTime <= 0.0) {
        this._sparkle();
        this.sparkleIntervalTime = UIConstants.DIAMOND_SPARKLE_MIN_INTERVAL_TIME + Math.random() * (UIConstants.DIAMOND_SPARKLE_MAX_INTERVAL_TIME - UIConstants.DIAMOND_SPARKLE_MIN_INTERVAL_TIME);
    }

    // Update position from game model.
    var diamond = this.gameController.getCollectible(this.diamondId);
    if (diamond)
    {
        this.smoothedX = (this.x + UIUtils.mpx(diamond.getX())) / 2.0;
        this.smoothedY = (this.y + UIUtils.mpx(diamond.getY())) / 2.0;
    }

    this.x = this.smoothedX;
    this.y = this.smoothedY;
};

UIDiamondSprite.prototype.spawn = function(x, y, rotation, diamondId, animate) {
    // Revive and place the sprite.
    this.reset(x, y);
    this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);
    this.rotation = rotation;
    
    this.smoothedX = x;
    this.smoothedY = y;
    
    if (animate) {
        this.game.sound.play('goldSpawn', 0.7);
    
        this.scale.setTo(0.01, 0.01);
        this.spawnTween = this.game.add.tween(this.scale).to({x: UIConstants.GAME_ASSET_SCALE, y: UIConstants.GAME_ASSET_SCALE}, UIConstants.DIAMOND_SPAWN_TIME, Phaser.Easing.Quadratic.Out, true);
    }

    // Create shine.
    this.diamondShine = this.shineGroup.getFirstExists(false);
    if (this.diamondShine) {
        var shineX = this.x;
        var shineY = this.y;
        var shineRotation = this.rotation;

        this.diamondShine.spawn(shineX, shineY, shineRotation);
    } else {
        this.log.error("Could not create diamond shine group. No group available.");
    }
    
    // Store diamondId.
    this.diamondId = diamondId;

    // Reset state.
    this.sparkleIntervalTime = UIConstants.DIAMOND_SPARKLE_MIN_INTERVAL_TIME + Math.random() * (UIConstants.DIAMOND_SPARKLE_MAX_INTERVAL_TIME - UIConstants.DIAMOND_SPARKLE_MIN_INTERVAL_TIME);
};

UIDiamondSprite.prototype.getExtraPositionInfo = function()
{
    if (this.diamondShine) {
        return this.diamondShine.getShineInfo();
    }

    return null;
};

UIDiamondSprite.prototype._sparkle = function()
{
    var sparkleImage = this.sparkleGroup.getFirstExists(false);
    if (sparkleImage) {
        var distance = Constants.DIAMOND.HEIGHT.px * 0.5 - 5 - Math.random() * 5;
        var angle = Math.random() * 2.0*Math.PI;

        var localX = Math.cos(angle) * distance * 0.5;
        var localY = Math.sin(angle) * distance;

        // Rotate sparkle position
        var sparkleX = this.x + Math.cos(this.rotation) * localX - Math.sin(this.rotation) * localY;
        var sparkleY = this.y + Math.sin(this.rotation) * localX + Math.cos(this.rotation) * localY;

        sparkleImage.spawn(sparkleX, sparkleY);
    } else {
        this.log.error("Could not create gold sparkle image. No image available.");
    }
};

UIDiamondSprite.prototype.remove = function()
{
    if (this.spawnTween) {
        this.spawnTween.stop();
    }

    this.kill();
    if (this.diamondShine) {
        this.diamondShine.remove();
    }
};

UIDiamondSprite.prototype.retire = function()
{
    if (this.spawnTween) {
        this.spawnTween.stop();
    }

    // Kill the sprite.
    this.kill();

    if (this.diamondShine) {
        this.diamondShine.retire();
    }
};
