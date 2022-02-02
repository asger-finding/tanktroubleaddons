//FIXME See if this can be ported to Classy.
UIGoldSprite = function(game, gameController, sparkleGroup)
{
    // Call super.
    Phaser.Sprite.call(this, game, 0, 0, 'game', 'gold');

    this.gameController = gameController;
    this.sparkleGroup = sparkleGroup;

    // Set up UI Physics body.
    this.game.physics.p2.enable(this);
    this.body.allowSleep = false;
    this.body.dynamic = true;
    this.body.angularDamping = 0.9;

    this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);
    
    this.sparkleIntervalTime = 0.0;

    // Disable gold.
    this.kill();
};

UIGoldSprite.prototype = Object.create(Phaser.Sprite.prototype);
UIGoldSprite.prototype.constructor = UIGoldSprite;

UIGoldSprite.prototype.update = function()
{
    // Check if exists or game is frozen.
    if (!this.exists || this.game.physics.arcade.isPaused) {
        return false;
    }
    
    this.sparkleIntervalTime -= this.game.time.delta;
    
    if (this.sparkleIntervalTime <= 0.0) {
        this._sparkle();
        this.sparkleIntervalTime = UIConstants.GOLD_SPARKLE_MIN_INTERVAL_TIME + Math.random() * (UIConstants.GOLD_SPARKLE_MAX_INTERVAL_TIME - UIConstants.GOLD_SPARKLE_MIN_INTERVAL_TIME);
    }
    
    // Update position from game model.
    var gold = this.gameController.getCollectible(this.goldId);
    if (gold)
    {
        this.smoothedX = (this.body.x + UIUtils.mpx(gold.getX())) / 2.0;
        this.smoothedY = (this.body.y + UIUtils.mpx(gold.getY())) / 2.0;
    }

    this.body.x = this.smoothedX;
    this.body.y = this.smoothedY;
};

UIGoldSprite.prototype.spawn = function(x, y, goldId, animate) {
    // Revive and place the sprite.
    this.reset(x, y);
    this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);
    
    this.smoothedX = x;
    this.smoothedY = y;
    
    if (animate) {
        this.game.sound.play('goldSpawn', 0.7);
    
        this.scale.setTo(0.01, 0.01);
        this.body.angularVelocity = (Math.random() > 0.5 ? 1 : -1) * (UIConstants.GOLD_MIN_ROTATION_SPEED + Math.random() * (UIConstants.GOLD_MAX_ROTATION_SPEED - UIConstants.GOLD_MIN_ROTATION_SPEED));
        this.spawnTween = this.game.add.tween(this.scale).to({x: UIConstants.GAME_ASSET_SCALE, y: UIConstants.GAME_ASSET_SCALE}, UIConstants.GOLD_SPAWN_TIME, Phaser.Easing.Quadratic.Out, true);
    }
    
    // Store goldId.
    this.goldId = goldId;

    // Reset state.
    this.sparkleIntervalTime = UIConstants.GOLD_SPARKLE_MIN_INTERVAL_TIME + Math.random() * (UIConstants.GOLD_SPARKLE_MAX_INTERVAL_TIME - UIConstants.GOLD_SPARKLE_MIN_INTERVAL_TIME);
};


UIGoldSprite.prototype.getExtraPositionInfo = function()
{
    return null;
};

UIGoldSprite.prototype._sparkle = function()
{
    var sparkleImage = this.sparkleGroup.getFirstExists(false);
    if (sparkleImage) {
        var distance = Constants.GOLD.RADIUS.px - Math.random() * 5;
        var angle = Math.random() * 2.0*Math.PI;
        
        
        var sparkleX = this.body.x + Math.cos(angle) * distance;
        var sparkleY = this.body.y + Math.sin(angle) * distance;
        
        sparkleImage.spawn(sparkleX, sparkleY);
    } else {
        this.log.error("Could not create gold sparkle image. No image available.");
    }
};

UIGoldSprite.prototype.remove = function()
{
    if (this.spawnTween) {
        this.spawnTween.stop();
    }

    this.kill();
};

UIGoldSprite.prototype.retire = function()
{
    if (this.spawnTween) {
        this.spawnTween.stop();
    }

    // Kill the sprite.
    this.kill();
};
