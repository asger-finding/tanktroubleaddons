//FIXME See if this can be ported to Classy.
UISpawnZoneSprite = function(game, gameController, tearingSound, unstableSound)
{
    // Call super.
    Phaser.Sprite.call(this, game, 0, 0);

    this.gameController = gameController;
    this.tearingSound = tearingSound;
    this.unstableSound = unstableSound;

    this.layer2Swirl = this.addChild(new Phaser.Image(game, 0, 0, 'game', 'spawnSwirl1'));
    this.layer2Swirl.anchor.setTo(0.5, 0.5);

    this.bolts = [];
    this.boltRotationSpeeds = [];
    const boltFrames = ['spawnSparkBolt0', 'spawnSparkBolt1', 'spawnSparkBolt2'];
    for (let i = 0; i < UIConstants.SPAWN_ZONE_NUM_BOLTS; ++i) {
        const bolt = this.addChild(new Phaser.Image(game, 0, 0, 'game', 'spawnSparkBolt0'));
        bolt.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);
        bolt.anchor.setTo(0.5, 0.85);
        ArrayUtils.shuffle(boltFrames);
        bolt.animations.add('buzz', boltFrames, 24, false).onComplete.add(
            function() {
                this.kill();
            },
            bolt
        );
        bolt.kill();
        this.bolts.push(bolt);
    }

    this.layer1Swirl = this.addChild(new Phaser.Image(game, 0, 0, 'game', 'spawnSwirl0'));
    this.layer1Swirl.anchor.setTo(0.5, 0.5);

    // Create spark emitter.
    this.emitter = this.addChild(new UISpawnZoneSparkEmitter(game));

    this.hole1 = this.addChild(new Phaser.Image(game, 0, 0, 'game', 'spawnHole'));
    this.hole1.anchor.setTo(0.5, 0.5);

    this.hole2 = this.addChild(new Phaser.Image(game, 0, 0, 'game', 'spawnHole'));
    this.hole2.anchor.setTo(0.5, 0.5);

    // Set up UI Physics body.
    this.game.physics.p2.enable(this);
    this.body.allowSleep = false;
    this.body.static = true;
    this.body.setCircle(UIUtils.mpx(Constants.SPAWN_ZONE_START_RADIUS));
    this.body.setCollisionGroup(UIUtils.spawnCollisionGroup);
    this.body.collides([UIUtils.fragmentCollisionGroup, UIUtils.rayCollisionGroup]);

    // Disable spawn zone.
    this.kill();
};

UISpawnZoneSprite.prototype = Object.create(Phaser.Sprite.prototype);
UISpawnZoneSprite.prototype.constructor = UISpawnZoneSprite;

UISpawnZoneSprite.prototype.spawn = function(zoneId, radius, unstable, animate)
{
    // Revive sprite.
    this.revive();

    // Store zoneId, radius and unstable.
    this.zoneId = zoneId;
    this.radius = radius;
    this.unstable = unstable;
    this.collapsing = false;

    this.expansionAnimation = 0.0;

    this.alpha = 1.0;

    if (animate) {
        this.alpha = 0.0;
        this.spawnTween = this.game.add.tween(this).to({alpha: 1.0}, UIConstants.SPAWN_ZONE_SPAWN_TIME, Phaser.Easing.Linear.None, true);
    }

    if (!this.unstable) {
        this.tearingSound.play();
    } else {
        this.tearingSound.play('', Constants.SPAWN_ZONE_LIFETIME - Constants.SPAWN_ZONE_END_GROW_TIME);
        this.unstableSound.play('', 0, 1.0);
    }

    const zoneScale = UIUtils.mpx(radius) / UIUtils.mpx(Constants.SPAWN_ZONE_END_RADIUS) * UIConstants.GAME_ASSET_SCALE;
    this.hole1.scale.setTo(zoneScale, zoneScale);
    this.hole2.scale.setTo(zoneScale, zoneScale);
    this.layer1Swirl.scale.setTo(zoneScale, zoneScale);
    this.layer2Swirl.scale.setTo(zoneScale, zoneScale);

    const zone = this.gameController.getZone(this.zoneId);
    if (zone) {
        const position = zone.getTiles()[0];
        const zonePosition = {x: (position.x + 0.5) * Constants.MAZE_TILE_SIZE.px, y: (position.y + 0.5) * Constants.MAZE_TILE_SIZE.px};

        this.body.x = zonePosition.x;
        this.body.y = zonePosition.y;
    }

};

UISpawnZoneSprite.prototype.update = function()
{
    // Check if exists or game is frozen.
    if (!this.exists || this.game.physics.arcade.isPaused) {
        return;
    }

    // Update children.
    this.emitter.update();

    this.hole1.rotation += UIConstants.SPAWN_ZONE_HOLE_1_ROTATION_SPEED * this.game.time.delta / 1000;
    this.hole2.rotation += UIConstants.SPAWN_ZONE_HOLE_2_ROTATION_SPEED * this.game.time.delta / 1000;
    this.layer1Swirl.rotation += UIConstants.SPAWN_ZONE_SWIRL_1_ROTATION_SPEED * this.game.time.delta / 1000;
    this.layer2Swirl.rotation += UIConstants.SPAWN_ZONE_SWIRL_2_ROTATION_SPEED * this.game.time.delta / 1000;

    // Update radius from game model.
    if (!this.collapsing) {
        const zone = this.gameController.getZone(this.zoneId);
        if (zone) {
            let radius = UIUtils.mpx(zone.getField("radius"));

            this.body.setCircle(radius);
            this.body.setCollisionGroup(UIUtils.spawnCollisionGroup);
            this.body.collides([UIUtils.fragmentCollisionGroup, UIUtils.rayCollisionGroup]);

            if (this.unstable) {
                for (let i = 0; i < this.bolts.length; ++i) {
                    const bolt = this.bolts[i];
                    if (!bolt.exists) {
                        if (Math.random() > UIConstants.INVERSE_SPAWN_ZONE_UNSTABLE_BOLT_PROBABILITY) {
                            bolt.revive();
                            const rotation = Math.random() * 2 * Math.PI;
                            bolt.x = Math.sin(rotation) * (radius + UIConstants.SPAWN_ZONE_UNSTABLE_BOLT_OFFSET);
                            bolt.y = -Math.cos(rotation) * (radius + UIConstants.SPAWN_ZONE_UNSTABLE_BOLT_OFFSET);
                            bolt.rotation = rotation;
                            bolt.animations.play('buzz');
                        }
                    }
                }

                radius += (Math.random() - 0.5) * UIConstants.SPAWN_ZONE_UNSTABLE_SHAKE;
                if (Math.random() > QualityManager.getQualityValue(QualityManager.QUALITY_PARAMETERS.SPAWN_ZONE_INVERSE_UNSTABLE_PARTICLE_PROBABILITY)) {
                    this.emitter.emit((radius + UIConstants.SPAWN_ZONE_UNSTABLE_PARTICLE_OFFSET), UIConstants.SPAWN_ZONE_UNSTABLE_PARTICLE_SPEED, 1);
                }

            } else {
                for (let i = 0; i < this.bolts.length; ++i) {
                    const bolt = this.bolts[i];
                    if (!bolt.exists) {
                        if (Math.random() > UIConstants.INVERSE_SPAWN_ZONE_STABLE_BOLT_PROBABILITY) {
                            bolt.revive();
                            const rotation = Math.random() * 2 * Math.PI;
                            bolt.x = Math.sin(rotation) * radius;
                            bolt.y = -Math.cos(rotation) * radius;
                            bolt.rotation = rotation;
                            bolt.animations.play('buzz');
                        }
                    }
                }

                this.expansionAnimation += this.game.time.delta;
                if (this.expansionAnimation >= UIConstants.SPAWN_ZONE_HOLE_EXPANSION_TIME) {
                    this.expansionAnimation -= Math.random() * UIConstants.SPAWN_ZONE_HOLE_EXPANSION_TIME;
                }
                radius += (this.expansionAnimation / UIConstants.SPAWN_ZONE_HOLE_EXPANSION_TIME) * UIConstants.SPAWN_ZONE_HOLE_EXPANSION_SIZE;
            }

            const zoneScale = radius / UIUtils.mpx(Constants.SPAWN_ZONE_END_RADIUS) * UIConstants.GAME_ASSET_SCALE;
            this.hole1.scale.setTo(zoneScale, zoneScale);
            this.hole2.scale.setTo(zoneScale, zoneScale);
            this.layer1Swirl.scale.setTo(zoneScale, zoneScale);
            this.layer2Swirl.scale.setTo(zoneScale, zoneScale);

        }
    } else {
        this.body.clearCollision();

        // FIXME Correct way to handle emitter?
        if (this.emitter.countLiving() == 0) {
            // Kill the sprite.
            this.kill();
        }
    }
};

UISpawnZoneSprite.prototype.destabilize = function()
{
    this.unstable = true;
    this.unstableSound.play('', 0, 1.0);
    this.game.sound.play('spawnZoneOpen');
};

UISpawnZoneSprite.prototype.remove = function()
{
    if (this.spawnTween) {
        this.spawnTween.stop();
        this.spawnTween = null;
    }

    this.collapsing = true;
    this.unstableSound.fadeOut(UIConstants.SPAWN_ZONE_BREAK_TIME);

    const zone = this.gameController.getZone(this.zoneId);
    if (zone) {
        const radius = UIUtils.mpx(zone.getField("radius"));
        const numParticles = QualityManager.getQualityValue(QualityManager.QUALITY_PARAMETERS.SPAWN_ZONE_NUM_COLLAPSE_PARTICLES);
        for (let i = 0; i < numParticles; ++i) {
            const speed = UIConstants.SPAWN_ZONE_COLLAPSE_MIN_PARTICLE_SPEED + Math.random() * (UIConstants.SPAWN_ZONE_COLLAPSE_MAX_PARTICLE_SPEED - UIConstants.SPAWN_ZONE_COLLAPSE_MIN_PARTICLE_SPEED);
            this.emitter.emit(radius, speed, 1);
        }
    }

    this.game.add.tween(this.layer2Swirl.scale).to({x: 0.0, y: 0.0}, UIConstants.SPAWN_ZONE_BREAK_TIME, Phaser.Easing.Linear.None, true, UIConstants.SPAWN_ZONE_BREAK_DELAY);
    this.game.add.tween(this.layer1Swirl.scale).to({x: 0.0, y: 0.0}, UIConstants.SPAWN_ZONE_BREAK_TIME, Phaser.Easing.Linear.None, true, UIConstants.SPAWN_ZONE_BREAK_DELAY);
    this.game.add.tween(this.hole1.scale).to({x: 0.0, y: 0.0}, UIConstants.SPAWN_ZONE_BREAK_TIME, Phaser.Easing.Linear.None, true, UIConstants.SPAWN_ZONE_BREAK_DELAY);
    this.game.add.tween(this.hole2.scale).to({x: 0.0, y: 0.0}, UIConstants.SPAWN_ZONE_BREAK_TIME, Phaser.Easing.Linear.None, true, UIConstants.SPAWN_ZONE_BREAK_DELAY);
};

UISpawnZoneSprite.prototype.retire = function()
{
    this.tearingSound.stop();
    this.unstableSound.stop();
    // FIXME Correct way to handle emitter?
    this.emitter.retire();
    // Kill the sprite.
    this.kill();
};
