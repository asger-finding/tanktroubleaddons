//FIXME See if this can be ported to Classy.
//FIXME Maybe collect sounds in a wrapper object.
UITankSprite = function(game, gameController, fireBulletSound, fireLaserSound, fireShotgunSound, fireMissileSound, weaponStoreSound, dustEmitter, launchEmitter)
{
    // Call super.
    Phaser.Sprite.call(this, game, 0, 0, 'game', 'base');

    this.gameController = gameController;
    this.fireBulletSound = fireBulletSound;
    this.fireLaserSound = fireLaserSound;
    this.fireShotgunSound = fireShotgunSound;
    this.fireMissileSound = fireMissileSound;
    this.weaponStoreSound = weaponStoreSound;
    this.dustEmitter = dustEmitter;
    this.launchEmitter = launchEmitter;

    // Set up UI Physics body.
    this.game.physics.p2.enable(this);
    this.body.allowSleep = false;
    this.body.kinematic = true;
    this.body.setRectangle(Constants.TANK.WIDTH.px, Constants.TANK.HEIGHT.px);
    this.body.addRectangle(Constants.BULLET_TURRET.WIDTH.px, Constants.BULLET_TURRET.HEIGHT.px, Constants.BULLET_TURRET.OFFSET_X.px, Constants.BULLET_TURRET.OFFSET_Y.px);
    this.body.setCollisionGroup(UIUtils.tankCollisionGroup);
    this.body.collides([UIUtils.fragmentCollisionGroup, UIUtils.rayCollisionGroup]);
    
    this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);
    
	//create tank treads, base and turret sprites.
    this.leftTread = this.addChild(new Phaser.Image(game, UIConstants.TANK_LEFT_TREAD_X, 0, 'game', 'tread'));
    this.leftTread.anchor.setTo(0.5, 0.5);
    this.leftTreadShade = this.addChild(new Phaser.Image(game, UIConstants.TANK_LEFT_TREAD_X, 0, 'game', 'treadShade0'));
    this.leftTreadShade.anchor.setTo(0.5, 0.5);

    this.rightTread = this.addChild(new Phaser.Image(game, UIConstants.TANK_RIGHT_TREAD_X, 0, 'game', 'tread'));
    this.rightTread.anchor.setTo(0.5, 0.5);
    this.rightTreadShade = this.addChild(new Phaser.Image(game, UIConstants.TANK_RIGHT_TREAD_X, 0, 'game', 'treadShade0'));
    this.rightTreadShade.anchor.setTo(0.5, 0.5);
    
    this.turret = this.addChild(new Phaser.Image(game, 0, UIConstants.TANK_TURRET_Y, 'game', 'turret0'));
    this.turret.animations.add('idleBullet', ['turret0'], 24, false);
    this.turret.animations.add('fireBullet', ['turret1', 'turret2'], 24, false).onComplete.add(function() {
            this.turret.animations.play('idleBullet');
        },
        this);
    this.turret.animations.add('idleLaser', ['turret3'], 24, false);
    this.turret.animations.add('idleDoubleBarrel', ['turret4'], 24, false);
    this.turret.animations.add('fireDoubleBarrelLeft', ['turret5', 'turret6'], 24, false).onComplete.add(function() {
            this.turret.animations.play('idleDoubleBarrel');
        },
        this);
    this.turret.animations.add('fireDoubleBarrelRight', ['turret7', 'turret8'], 24, false).onComplete.add(function() {
            this.turret.animations.play('idleDoubleBarrel');
        },
        this);
    this.turret.animations.add('idleShotgun', ['turret9'], 24, false);
    this.turret.animations.add('fireShotgun', ['turret9', 'turret9', 'turret9', 'turret9', 'turret9', 'turret9', 'turret9', 'turret9', 'turret9', 'turret9', 'turret9', 'turret10', 'turret11', 'turret11', 'turret11', 'turret11', 'turret11', 'turret11', 'turret10', 'turret9', 'turret9', 'turret9', 'turret9'], 24, false).onComplete.add(function() {
            this.turret.animations.play('idleShotgun');
        },
        this);
    this.turret.animations.add('idleHomingMissile', ['turret12'], 24 ,false);
    this.turret.animations.add('fireHomingMissile', ['turret13'], 24, false);

    this.turret.anchor.setTo(0.5, 0.5);
    
    this.leftTreadPosition = 0.0;
    this.rightTreadPosition = 0.0;
    
    // Disable tank.
    this.kill();
};

UITankSprite.prototype = Object.create(Phaser.Sprite.prototype);
UITankSprite.prototype.constructor = UITankSprite;

UITankSprite.prototype.update = function()
{
    if (!this.exists) {
        return;
    }
    
    // Update position from game model.
    var tank = this.gameController.getTank(this.playerId);
    if (tank)
    {
        this.smoothedX = (this.body.x * this.smoothing + UIUtils.mpx(tank.getX())) / (this.smoothing + 1);
        this.smoothedY = (this.body.y * this.smoothing + UIUtils.mpx(tank.getY())) / (this.smoothing + 1);
        this.smoothedRotation = (this.body.rotation * this.smoothing + tank.getRotation()) / (this.smoothing + 1);

        // Move the treads according to UIConstants that define forward/back animation speeds.
        var deltaTime = this.game.time.physicsElapsedMS;
        
        if (tank.getSpeed() > 0.0) {
            var ratio = tank.getSpeed() / Constants.TANK.FORWARD_SPEED.m;
            if (tank.getRotationSpeed() < 0.0) {
                this.leftTreadPosition += deltaTime * ratio * UIConstants.TANK_TREAD_INNER_FORWARD_SPEED;
                this.rightTreadPosition += deltaTime * ratio * UIConstants.TANK_TREAD_FORWARD_SPEED;
            } else if (tank.getRotationSpeed() > 0.0){
                this.leftTreadPosition += deltaTime * ratio * UIConstants.TANK_TREAD_FORWARD_SPEED;
                this.rightTreadPosition += deltaTime * ratio * UIConstants.TANK_TREAD_INNER_FORWARD_SPEED;
            } else {
                this.leftTreadPosition += deltaTime * ratio * UIConstants.TANK_TREAD_FORWARD_SPEED;
                this.rightTreadPosition += deltaTime * ratio * UIConstants.TANK_TREAD_FORWARD_SPEED;
            }
        } else if (tank.getSpeed() < 0.0) {
            var ratio = -tank.getSpeed() / Constants.TANK.BACK_SPEED.m;
            if (tank.getRotationSpeed() < 0.0) {
                this.leftTreadPosition -= deltaTime * ratio * UIConstants.TANK_TREAD_INNER_BACK_SPEED;
                this.rightTreadPosition -= deltaTime * ratio * UIConstants.TANK_TREAD_BACK_SPEED;
            } else if (tank.getRotationSpeed() > 0.0){
                this.leftTreadPosition -= deltaTime * ratio * UIConstants.TANK_TREAD_BACK_SPEED;
                this.rightTreadPosition -= deltaTime * ratio * UIConstants.TANK_TREAD_INNER_BACK_SPEED;
            } else {
                this.leftTreadPosition -= deltaTime * ratio * UIConstants.TANK_TREAD_BACK_SPEED;
                this.rightTreadPosition -= deltaTime * ratio * UIConstants.TANK_TREAD_BACK_SPEED;
            }
        } else {
            if (tank.getRotationSpeed() < 0.0) {
                this.leftTreadPosition -= deltaTime * UIConstants.TANK_TREAD_TURN_SPEED;
                this.rightTreadPosition += deltaTime * UIConstants.TANK_TREAD_TURN_SPEED;
            } else if (tank.getRotationSpeed() > 0.0){
                this.leftTreadPosition += deltaTime * UIConstants.TANK_TREAD_TURN_SPEED;
                this.rightTreadPosition -= deltaTime * UIConstants.TANK_TREAD_TURN_SPEED;
            }             
        }
        
        this.leftTreadPosition = (this.leftTreadPosition + 12) % 12;
        this.rightTreadPosition = (this.rightTreadPosition + 12) % 12;

        // Update the frames of the tread sprites.
        this.leftTreadShade.frameName = 'treadShade'+Math.floor(this.leftTreadPosition);
        this.rightTreadShade.frameName = 'treadShade'+Math.floor(this.rightTreadPosition);
    }
    this.body.x = this.smoothedX;
    this.body.y = this.smoothedY;
    this.body.rotation = this.smoothedRotation;
};

UITankSprite.prototype.spawn = function(x, y, rotation, playerId, animate, smoothing) {
    // Revive and place the sprite.
    this.reset(x, y);
    this.body.rotation = rotation;
    this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);

    this.smoothedX = x;
    this.smoothedY = y;
    this.smoothedRotation = rotation;
    this.smoothing = smoothing;

    // Reset animations.
    this.turret.animations.play('idleBullet');

    if (animate) {
        this.scale.setTo(0.01, 0.01);
        this.spawnTween = this.game.add.tween(this.scale).to({x: UIConstants.GAME_ASSET_SCALE, y: UIConstants.GAME_ASSET_SCALE}, UIConstants.CRATE_SPAWN_TIME, UIUtils.easingCubicBezier(0.01, 1.5, 1.5, 1), true);
        this.spawnTween.onComplete.add(
            function() {
                this.game.sound.play('tankLand', 0.6);
                this.dustEmitter.spawn(this.x, this.y);
            },
            this
        );
    }


    // Store playerId.
    this.playerId = playerId;
    
    // Send request for player details.
    var self = this;
    Backend.getInstance().getPlayerDetails(
        function(result) {
            if (typeof(result) == "object") {
                self.tint = result.getBaseColour().numericValue;
                self.turret.tint = result.getTurretColour().numericValue;
                self.leftTread.tint = result.getTreadColour().numericValue;
                self.rightTread.tint = result.getTreadColour().numericValue;
            } else {
                self.tint = UIConstants.TANK_UNAVAILABLE_COLOUR.numericValue;
                self.turret.tint = UIConstants.TANK_UNAVAILABLE_COLOUR.numericValue;
                self.leftTread.tint = UIConstants.TANK_UNAVAILABLE_COLOUR.numericValue;
                self.rightTread.tint = UIConstants.TANK_UNAVAILABLE_COLOUR.numericValue;
            }
        },
        function(result) {
            
        },
        function(result) {
            
        },
        this.playerId, Caches.getPlayerDetailsCache()
    );
};

UITankSprite.prototype.addWeapon = function(weaponId, animate)
{
    var activeWeapon = this.gameController.getActiveWeapon(this.playerId);

    var defaultWeapon = this.gameController.getDefaultWeapon(this.playerId);
    var queuedWeapons = this.gameController.getQueuedWeapons(this.playerId);

    if (activeWeapon) {
    
        if (animate) {
            // Only play sound if is not the first weapon added.
            if ((defaultWeapon && weaponId !== defaultWeapon.getId()) || queuedWeapons.length > 0) {
                if (weaponId === activeWeapon.getId()) {
                    // FIXME Play sound depending on weapon.
                    this.weaponStoreSound.play();
                } else {
                    this.weaponStoreSound.play();
                }
            }
        }

        if (weaponId === activeWeapon.getId()) {
            this._updateTurret(activeWeapon);
        }        
    }
};

UITankSprite.prototype.removeWeapon = function()
{
    var activeWeapon = this.gameController.getActiveWeapon(this.playerId);
    
    if (activeWeapon) {
        this._updateTurret(activeWeapon);
    }
};

UITankSprite.prototype.fire = function()
{
    var activeWeapon = this.gameController.getActiveWeapon(this.playerId);
    if (activeWeapon) {
        switch(activeWeapon.getType()) {
            case Constants.WEAPON_TYPES.BULLET:
            {
                this.fireBulletSound.play();
                this.turret.animations.play('fireBullet');
                break;
            }
            case Constants.WEAPON_TYPES.LASER:
            {
                this.fireLaserSound.play();
                break;
            }
            case Constants.WEAPON_TYPES.DOUBLE_BARREL:
            {
                this.fireBulletSound.play();
                if (activeWeapon.getField("leftBarrel")) {
                    this.turret.animations.play('fireDoubleBarrelLeft');
                } else {
                    this.turret.animations.play('fireDoubleBarrelRight');
                }
                break;
            }
            case Constants.WEAPON_TYPES.SHOTGUN:
            {
                this.fireShotgunSound.play();
                this.turret.animations.play('fireShotgun');
                break;
            }
            case Constants.WEAPON_TYPES.HOMING_MISSILE:
            {
                this.fireMissileSound.play();
                this.launchEmitter.spawn(this.x, this.y, this.rotation);
                this.turret.animations.play('fireHomingMissile');

                break;
            }
        }
    }
};

UITankSprite.prototype.remove = function()
{
    if (this.spawnTween) {
        this.spawnTween.stop();
    }

    // Kill the sprite.
    this.kill();
    
}

UITankSprite.prototype.retire = function()
{
    if (this.spawnTween) {
        this.spawnTween.stop();
    }

    // Kill the sprite.
    this.kill();
};

UITankSprite.prototype._updateTurret = function(weapon)
{
    // Set correct turret frame.
    switch(weapon.getType()) {
        case Constants.WEAPON_TYPES.BULLET:
        {
            this.turret.animations.play('idleBullet');
            break;
        }
        case Constants.WEAPON_TYPES.LASER:
        {
            this.turret.animations.play('idleLaser');
            break;
        }
        case Constants.WEAPON_TYPES.DOUBLE_BARREL:
        {
            this.turret.animations.play('idleDoubleBarrel');
            break;
        }
        case Constants.WEAPON_TYPES.SHOTGUN:
        {
            this.turret.animations.play('idleShotgun');
            break;
        }
        case Constants.WEAPON_TYPES.HOMING_MISSILE:
        {
            if (!weapon.getField('launched')) {
                this.turret.animations.play('idleHomingMissile');
            } else {
                this.turret.animations.play('fireHomingMissile');
            }
            break;
        }
    }
};