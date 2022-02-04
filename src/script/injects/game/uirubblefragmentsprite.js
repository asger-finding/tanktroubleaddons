//FIXME See if this can be ported to Classy.
UIRubbleFragmentSprite = function(game)
{
    const randomRubbleIndex = Math.floor(Math.random() * 3);
    
    // Call super.
    Phaser.Sprite.call(this, game, 0, 0, 'game', 'rubble' + randomRubbleIndex);

    // Set up UI Physics body.
    this.game.physics.p2.enable(this);
    this.body.allowSleep = false;
    this.body.damping = 0.95;
    this.body.angularDamping = 0.95;
    this.body.onBeginContact.add(this._hitSomething, this);

    this.body.clearShapes();
    this.body.loadPolygon('game-physics', 'rubble' + randomRubbleIndex);

    this.body.setMaterial(UIUtils.fragmentMaterial);
    this.body.collides([UIUtils.wallCollisionGroup]);
    this.body.setCollisionGroup(UIUtils.fragmentCollisionGroup);

    this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);

    // Disable fragment.
    this.kill();
};

UIRubbleFragmentSprite.prototype = Object.create(Phaser.Sprite.prototype);
UIRubbleFragmentSprite.prototype.constructor = UIRubbleFragmentSprite;

UIRubbleFragmentSprite.prototype.update = function()
{
    // Check if exists or game is frozen.
    if (!this.exists || this.game.physics.arcade.isPaused) {
        return;
    }

    this.timeAlive += this.game.time.delta;
    
    if (!this.fading && this.timeAlive > this.lifetime) {
        // Start fading out.
        this.fading = true;
    }
    
    if (this.fading) {
        this.alpha = Math.max(0.0, this.alpha - 0.035);
    }

    // Disable when all faded out.
    if (this.alpha == 0.0) {
        this.kill();
    }
};

UIRubbleFragmentSprite.prototype.spawn = function(x, y, rotation, speed)
{
    // Determine a direction for the fragment.
    let speedX = Math.sin(rotation) * speed; // Normally it would be Math.cos(rotation), but the tank graphics is rotated 90 degrees CCW
    let speedY = -Math.cos(rotation) * speed; // Normally it would be Math.sin(rotation), but the tank graphics is rotated 90 degrees CCW

    speedX *= -UIConstants.RUBBLE_FRAGMENT_SPEED_SCALE;
    speedY *= -UIConstants.RUBBLE_FRAGMENT_SPEED_SCALE;

    speedX += Math.random() * UIConstants.RUBBLE_FRAGMENT_RANDOM_SPEED - UIConstants.RUBBLE_FRAGMENT_RANDOM_SPEED / 2.0;
    speedY += Math.random() * UIConstants.RUBBLE_FRAGMENT_RANDOM_SPEED - UIConstants.RUBBLE_FRAGMENT_RANDOM_SPEED / 2.0;

    // Offset fragment to either left or right tread.
    if (Math.random() < 0.5) {
        x += Math.cos(rotation) * -UIConstants.RUBBLE_TREAD_OFFSET;
        y += Math.sin(rotation) * -UIConstants.RUBBLE_TREAD_OFFSET;
    } else {
        x += Math.cos(rotation) * UIConstants.RUBBLE_TREAD_OFFSET;
        y += Math.sin(rotation) * UIConstants.RUBBLE_TREAD_OFFSET;
    }

    // Revive and place the sprite.
    this.reset(x, y);
    this.alpha = 1.0;
    this.body.rotation = Math.random() * Math.PI * 2.0;
    this.body.velocity.x = speedX;
    this.body.velocity.y = speedY;
    this.body.angularVelocity = Math.random() * UIConstants.RUBBLE_FRAGMENT_MAX_ROTATION_SPEED - UIConstants.RUBBLE_FRAGMENT_MAX_ROTATION_SPEED / 2.0;

    // Set state.
    this.timeAlive = 0.0;
    this.lifetime = UIConstants.RUBBLE_FRAGMENT_MIN_LIFETIME + Math.random() * (UIConstants.RUBBLE_FRAGMENT_MAX_LIFETIME - UIConstants.RUBBLE_FRAGMENT_MIN_LIFETIME);
    this.fading = false;
};

UIRubbleFragmentSprite.prototype.retire = function()
{
    // Kill the sprite.
    this.kill();
};

UIRubbleFragmentSprite.prototype._hitSomething = function(body, shapeA, shapeB, equation)
{
    // Start fading out.
    this.fading = true;
};
