//FIXME See if this can be ported to Classy.
UIExplosionFragmentSprite = function(game)
{
    const randomFragmentIndex = Math.floor(Math.random() * 10);

    // Call super.
    Phaser.Sprite.call(this, game, 0, 0, 'game', 'fragment' + randomFragmentIndex);

    // Set up UI Physics body.
    this.game.physics.p2.enable(this);
    this.body.allowSleep = false;
    this.body.damping = 0.25;
    this.body.angularDamping = 0.25;
    this.body.onBeginContact.add(this._hitSomething, this);

    this.body.clearShapes();
    this.body.loadPolygon('game-physics', 'fragment' + randomFragmentIndex);

    this.body.setMaterial(UIUtils.fragmentMaterial);
    this.body.clearCollision();
    this.body.setCollisionGroup(UIUtils.fragmentCollisionGroup);

    this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);

    // Disable fragment.
    this.kill();
}

UIExplosionFragmentSprite.prototype = Object.create(Phaser.Sprite.prototype);
UIExplosionFragmentSprite.prototype.constructor = UIExplosionFragmentSprite;

UIExplosionFragmentSprite.prototype.update = function()
{
    // Check if exists or game is frozen.
    if (!this.exists || this.game.physics.arcade.isPaused) {
        return;
    }

    this.timeAlive += this.game.time.delta;
    
    if (!this.colliding && this.timeAlive > UIConstants.EXPLOSION_FRAGMENT_COLLISION_TIME) {
        // Set collision.
        this.colliding = true;
        this.body.collides([UIUtils.wallCollisionGroup, UIUtils.tankCollisionGroup, UIUtils.crateCollisionGroup, UIUtils.shieldCollisionGroup, UIUtils.spawnCollisionGroup]);
    }
    
    if (!this.fading && this.timeAlive > this.lifetime) {
        // Start fading out.
        this.fading = true;
    }
    
    if (this.fading) {
        this.alpha = Math.max(0.0, this.alpha - 0.025);
    }

    // Disable when all faded out.
    if (this.alpha == 0.0) {
        this.kill();
    }
}

UIExplosionFragmentSprite.prototype.spawn = function(x, y, playerId)
{

    // Store playerId.
    this.playerId = playerId;
    
    // Send request for player details.
    const self = this;
    Backend.getInstance().getPlayerDetails(
        function(result) {
            if (typeof(result) == "object") {
                if (Math.random() > 0.4) {
                    self.tint = result.getBaseColour().numericValue;
                } else {
                    self.tint = result.getTurretColour().numericValue;
                }
            } else {
                self.tint = UIConstants.TANK_UNAVAILABLE_COLOUR.numericValue;
            }
        },
        function(result) {
            
        },
        function(result) {
            
        },
        this.playerId, Caches.getPlayerDetailsCache()
    );
    
    // Determine a random direction for the fragment.
    const speed = UIConstants.EXPLOSION_FRAGMENT_MIN_SPEED + Math.random() * (UIConstants.EXPLOSION_FRAGMENT_MAX_SPEED - UIConstants.EXPLOSION_FRAGMENT_MIN_SPEED);
    const direction = Math.random() * Math.PI * 2.0;
    const speedX = Math.cos(direction) * speed;
    const speedY = Math.sin(direction) * speed;
    
    x += Math.cos(direction) * (Math.random() * Constants.TANK.WIDTH.px/4.0 + Constants.TANK.WIDTH.px/4.0);
    y += Math.sin(direction) * (Math.random() * Constants.TANK.WIDTH.px/4.0 + Constants.TANK.WIDTH.px/4.0);
    
    // Revive and place the sprite.
    this.reset(x, y);
    this.alpha = 1.0;
    this.body.rotation = Math.random() * Math.PI * 2.0;
    this.body.velocity.x = speedX;
    this.body.velocity.y = speedY;
    this.body.angularVelocity = Math.random() * UIConstants.EXPLOSION_FRAGMENT_MAX_ROTATION_SPEED - UIConstants.EXPLOSION_FRAGMENT_MAX_ROTATION_SPEED / 2.0;
    this.body.clearCollision(false);

    // Set state.
    this.timeAlive = 0.0;
    this.lifetime = UIConstants.EXPLOSION_FRAGMENT_MIN_LIFETIME + Math.random() * (UIConstants.EXPLOSION_FRAGMENT_MAX_LIFETIME - UIConstants.EXPLOSION_FRAGMENT_MIN_LIFETIME);
    this.colliding = false;
    this.fading = false;
}

UIExplosionFragmentSprite.prototype.retire = function()
{
    // Kill the sprite.
    this.kill();
}

UIExplosionFragmentSprite.prototype._hitSomething = function(body, shapeA, shapeB, equation)
{
    // Start fading out.
    this.fading = true;
}
