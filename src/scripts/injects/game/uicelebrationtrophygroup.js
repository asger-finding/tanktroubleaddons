//FIXME See if this can be ported to Classy.
// FIXME TODO Generalize to multiple winners!
UICelebrationTrophyGroup = function(game)
{
    // Call super.
    Phaser.Group.call(this, game, null);

    // Add header.
    this.header = this.addChild(new Phaser.Text(game, 0, UIConstants.CELEBRATION_HEADER_Y, '', {font: UIConstants.CELEBRATION_HEADER_FONT_SIZE+"px TankTrouble", fontWeight: "bold", fill: "#000000", stroke: "#ffffff", strokeThickness: UIConstants.CELEBRATION_HEADER_STROKE_WIDTH}));
    this.header.anchor.setTo(0.5, 0.5);

    // Add trophy sprite.
    this.trophySprite = this.addChild(new Phaser.Image(this.game, 0, 0, 'celebration', 'trophy'));
    this.trophySprite.anchor.setTo(0.5, 0.5);

/*    // Add streamer group.
    this.streamerGroup = this.game.add.group(this);

    // Add pool of streamers.
    for (let i = 0; i < UIConstants.SCORE_FRAGMENT_POOL_SIZE; ++i) {
        this.streamerGroup.add(new UIStreamerGraphics(game));
    }*/

    // Add tank icon.
    this.tankIconSprite = this.addChild(new UITankIconImage(this.game, false, UIConstants.TANK_ICON_SIZES.LARGE));
    this.tankIconSprite.anchor.setTo(0.5, 0.5);

    // Add trophy base fragment group.
    this.trophyBaseFragmentGroup = this.game.add.group(this);

    // Add pool of trophy base fragments.
    for (let i = 0; i < UIConstants.TROPHY_BASE_FRAGMENT_POOL_SIZE; ++i) {
        this.trophyBaseFragmentGroup.add(new UITrophyExplosionFragmentSprite(game, 'trophyBaseFragment', true, 3));
    }

    // Add trophy fragment group.
    this.trophyFragmentGroup = this.game.add.group(this);

    // Add pool of trophy fragments.
    for (let i = 0; i < UIConstants.TROPHY_FRAGMENT_POOL_SIZE; ++i) {
        this.trophyFragmentGroup.add(new UITrophyExplosionFragmentSprite(game, 'trophyFragment', true, 5));
    }

    // Add trophy handles.
    this.trophyLeftHandleSprite = this.addChild(new UITrophyExplosionFragmentSprite(game, 'trophyLeftHandle', false));
    this.trophyRightHandleSprite = this.addChild(new UITrophyExplosionFragmentSprite(game, 'trophyRightHandle', false));

    // Add confetti emitter.
    this.confettiEmitter = this.addChild(new UIConfettiEmitter(game));

    // Add trophy explosion smoke.
    this.explosionEmitter = this.addChild(new UITrophyExplosionEmitter(game));

    // Setup floor body.
    this.floorBody = new Phaser.Physics.P2.Body(game, null, 0.0, 0.0);
    this.floorBody.static = true;
    this.floorBody.addPlane(0.0, UIConstants.TROPHY_EXPLOSION_FLOOR_Y, 0.0);
    this.floorBody.setMaterial(UIUtils.gameFloorMaterial);
    this.floorBody.setCollisionGroup(UIUtils.gameFloorCollisionGroup);
    this.floorBody.collides([UIUtils.trophyFragmentCollisionGroup]);

    // Disable group.
    this.exists = false;
    this.visible = false;

    // Kill sprites.
    this.header.kill();
    this.trophySprite.kill();
    this.tankIconSprite.kill();

    // State.
    this.victoryAward = null;
    this.timeAlive = 0.0;
    this.exploded = false;
    this.handedOutPrizes = false;
    this.ended = false;

    // Create log.
    this.log = Log.create('UICelebrationTrophyGroup');
};

UICelebrationTrophyGroup.prototype = Object.create(Phaser.Group.prototype);
UICelebrationTrophyGroup.prototype.constructor = UICelebrationTrophyGroup;

UICelebrationTrophyGroup.prototype.update = function()
{
    if (!this.exists) {
        return;
    }

    this.timeAlive += this.game.time.delta;

    if (!this.exploded) {
        if (this.timeAlive >= UIConstants.CELEBRATION_TROPHY_LIFETIME) {
            this._explode();
        }
    }

    if (!this.handedOutPrizes) {
        if (this.timeAlive >= UIConstants.CELEBRATION_PRIZE_HANDOUT_TIME) {
            const gameBounds = this.game.scale.bounds;
            const position = this.tankIconSprite.toGlobal(new Phaser.Point(0, 0));
            // Scale from game canvas position to pixel position.
            Phaser.Point.divide(position, this.game.scale.scaleFactor, position);
            const pagePosition = {x: gameBounds.x + position.x, y: gameBounds.y + position.y};

            for (let i = 0; i < this.victoryAward.getPlayerIds().length; ++i) {
                const playerId = this.victoryAward.getPlayerIds()[i];
                GameManager.sendVictoryGoldToTank(playerId, this.victoryAward.getGoldAmountPerWinner(), pagePosition);
                GameManager.showXPChange(this.victoryAward.getExperiencePerWinner(), UIPlayerPanel.getLocalTankIconPosition(playerId), 1200);
            }

            UIPlayerPanel.showRankChanges(this.victoryAward.getRankChanges());

            this.handedOutPrizes = true;
        }
    }

    if (!this.ended) {
        if (this.timeAlive >= UIConstants.CELEBRATION_TANK_LIFETIME) {
            if (this.victoryAward.getPlayerIds().length > 0) {
                this.game.add.tween(this.header.scale).to({x: 0.0, y: 0.0}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None, true);

                this.tankIconSprite.remove();
                this.ended = true;
            }
        }
    }

    // Call super.
    Phaser.Group.prototype.update.call(this);
};

UICelebrationTrophyGroup.prototype.postUpdate = function() {
    if (!this.exists) {
        return;
    }

    // Call super.
    Phaser.Group.prototype.postUpdate.call(this);
};

UICelebrationTrophyGroup.prototype.spawn = function(x, y, modeName, victoryAward)
{
    // Revive and place the group.
    this.exists = true;
    this.visible = true;
    this.x = x;
    this.y = y;

    // Store victoryAward.
    this.victoryAward = victoryAward;

    // Reset state.
    this.timeAlive = 0.0;
    this.exploded = false;
    this.handedOutPrizes = false;
    this.ended = false;

    // Add floor.
    this.game.physics.p2.addBody(this.floorBody);

    // Turn on gravity.
    this.game.physics.p2.gravity.y = UIConstants.TROPHY_FRAGMENT_GRAVITY;

    this.header.revive();
    this.header.setText(modeName + ' winner is..');
    this.header.scale.set(0.0, 0.0);

    this.game.add.tween(this.header.scale).to({x: 1.0, y: 1.0}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true);

    this.trophySprite.revive();
    this.trophySprite.scale.set(0.0, 0.0);

    this.tankIconSprite.retire();

    this.game.add.tween(this.trophySprite.scale).to({x: 1.0, y: 1.0}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true);
};

UICelebrationTrophyGroup.prototype._explode = function()
{
    this.exploded = true;

    this.game.add.tween(this.trophySprite.scale).to({x: 1.2, y: 1.2}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Back.In, true).onComplete.add(
        function() {
            this.trophySprite.kill();

            // Spawn fragments.
            for (let i = 0; i < UIConstants.TROPHY_BASE_FRAGMENT_POOL_SIZE; ++i) {
                const fragment = this.trophyBaseFragmentGroup.getFirstExists(false);
                if (fragment) {
                    fragment.spawn(0, UIConstants.TROPHY_EXPLOSION_Y + UIConstants.TROPHY_BASE_FRAGMENT_EXPLOSION_OFFSET, this.trophySprite.width * 0.75, this.trophySprite.height * 0.25);
                } else {
                    this.log.error("Could not create trophy fragment sprite. No sprite available.");
                }
            }
            for (let i = 0; i < UIConstants.TROPHY_FRAGMENT_POOL_SIZE; ++i) {
                const fragment = this.trophyFragmentGroup.getFirstExists(false);
                if (fragment) {
                    fragment.spawn(0, UIConstants.TROPHY_EXPLOSION_Y, this.trophySprite.width * 0.75, this.trophySprite.height * 0.75);
                } else {
                    this.log.error("Could not create trophy fragment sprite. No sprite available.");
                }
            }
            this.trophyLeftHandleSprite.spawn(-this.trophySprite.width * 0.355, -this.trophySprite.height * 0.295, 0, 0, false);
            this.trophyRightHandleSprite.spawn(this.trophySprite.width * 0.355, -this.trophySprite.height * 0.295, 0, 0, false);
            // Spawn confetti.
            this.confettiEmitter.spawn(0, 0);
            // Spawn explosion smoke.
            this.explosionEmitter.spawn(0, UIConstants.TROPHY_EXPLOSION_Y);

            /*for (let i = 0; i < 3; ++i) {
                const streamer = this.streamerGroup.getFirstExists(false);
                if (streamer) {
                    streamer.spawn(0, 0, Math.floor(Math.random() * 150 + 100) + (Math.floor(Math.random() * 150 + 100) << 8) + (Math.floor(Math.random() * 150 + 100) << 16));
                } else {
                    this.log.error("Could not create streamer sprite. No sprite available.");
                }
            }*/
        },
        this
    );

    if (this.victoryAward.getPlayerIds().length > 0) {
        const self = this;
        // Get player name.
        Backend.getInstance().getPlayerDetails(
            function(result) {
                if (typeof(result) == "object") {
                    const username = Utils.maskUnapprovedUsername(result);
                    self.header.setText(username);
                    self.game.add.tween(self.header.scale).to({x: 1.4, y: 1.4}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true);
                } else {
                    self.header.setText("Scrapped");
                }
            },
            null,
            null,
            this.victoryAward.getPlayerIds()[0],
            Caches.getPlayerDetailsCache()
        );

        this.tankIconSprite.spawn(0, 0, this.victoryAward.getPlayerIds()[0], false, true);
    }



};

UICelebrationTrophyGroup.prototype.retire = function()
{
    // FIXME Correct way to handle emitters?
    this.confettiEmitter.retire();
    this.explosionEmitter.retire();

    // Remove floor.
    this.game.physics.p2.removeBody(this.floorBody);

    // Turn off gravity.
    this.game.physics.p2.gravity.y = 0;

    // Kill the fragments.
    this.trophyBaseFragmentGroup.callAll('retire');
    this.trophyFragmentGroup.callAll('retire');
    this.trophyLeftHandleSprite.retire();
    this.trophyRightHandleSprite.retire();
    // Kill the streamers.
    //this.streamerGroup.callAll('retire');
    // Kill the sprites.
    this.header.kill();
    this.trophySprite.kill();
    this.tankIconSprite.kill();
    // Kill the group.
    this.exists = false;
    this.visible = false;
};
