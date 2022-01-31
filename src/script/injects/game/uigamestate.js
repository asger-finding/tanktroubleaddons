var Game = Game || {};

Game.UIGameState = Classy.newClass();

/*
 * Phaser fills in some properties:
 *  - game - a reference to the Phaser.Game
 *  - input - a reference to the Phaser.Input input manager
 *
*/

Game.UIGameState.constructor(function() {
});

Game.UIGameState.fields({
    gameController: null,
    gameGroup: null,
    mazeFloorGroup: null,
    spawnZoneGroup: null,
    rubbleGroup: null,
    dustGroup: null,
    crateGroup: null,
    goldGroup: null,
    diamondShineGroup: null,
    diamondGroup: null,
    sparkleGroup: null,
    projectileGroup: null,
    missileGroup: null,
    missileSmokeGroup: null,
    aimerGroup: null,
    laserGroup: null,
    tankGroup: null,
    mazeWallGroup: null,
    explosionGroup: null,
    tankFeatherGroup: null,
    bulletPuffGroup: null,
    missileLaunchGroup: null,
    mazeWallDecorationGroup: null,
    shieldGroup: null,
    shieldSparkGroup: null,
    tankSprites: {},
    collectibles: {},
    projectiles: {},
    upgrades: {},
    // FIXME: Move weapons management from tank to here?
    counters: {},
    zones: {},

    overlayGroup: null,
    overtimeGroup: null,
    counterTimerGroup: null,
    countDownGroup: null,
    tankNameGroup: null,
    chatSymbolGroup: null,
    weaponSymbolGroup: null,
    leaveGameGroup: null,
    chatSymbolSprites: {},
    weaponSymbolGroups: {},

    fireBulletSound: null,
    bulletBounceSound: null,
    bulletBounce2Sound: null,
    shieldImpactSound: null,
    fireLaserSound: null,
    fireShotgunSound: null,
    fireMissileSound: null,
    homingMissileTargetChangeSound: null,
    homingMissileTargetingSound: null,
    weaponStoreSound: null,
    tankExplosionSound: null,
    bulletPuffSound: null,
    chickenOutSound: null,
    shieldWeakenedSound: null,
    spawnZoneTearingSound: null,
    spawnZoneUnstableSound: null,

    maze: null,
    roundEnded: false,
    celebrationDuration: 0.0,
    roundTitleDelayDuration: 0.0,
    roundTitleShown: false,
    nextVictoryAward: null,

    waitingIconGroup: null,
    waitingTime: 0,

    roundTitleGroup: null,

    betweenRoundsDuration: 0,

    celebrationTrophyGroup: null,

    cameraShake: 0,

    log: null
});

Game.UIGameState.methods({
    init: function(gameController) {
        this.gameController = gameController;
    },

    preload: function() {
        // Trigger load of images used for "breaking out" of Phaser canvas.
        // This prevents a one-frame flicker when breaking out first time.
        var goldImage = $("<img class='hidden' src='" + g_url("assets/images/game/gold.png") + "' srcset='" + g_url("assets/images/game/gold@2x.png") + " 2x'>");
        var diamondImage = $("<img class='hidden' src='" + g_url("assets/images/game/diamond.png") + "' srcset='" + g_url("assets/images/game/diamond@2x.png") + " 2x'>");
        var diamondGlowImage = $("<img class='hidden' src='" + g_url("assets/images/game/diamondGlow.png") + "' srcset='" + g_url("assets/images/game/diamondGlow@2x.png") + " 2x'>");
        var diamondRayImage = $("<img class='hidden' src='" + g_url("assets/images/game/diamondRays.png") + "' srcset='" + g_url("assets/images/game/diamondRays@2x.png") + " 2x'>");
        $("body").append(goldImage).append(diamondImage).append(diamondGlowImage).append(diamondRayImage);
    },

    create: function() {
        // Create log.
        this.log = Log.create('UIGameState');

        // Initialize physics system for UI elements
        UIUtils.initUIGamePhysics(this.game);

        // Create sounds.
        this.fireBulletSound = this.game.add.audio('fireBullet');
        this.bulletBounceSound = this.game.add.audio('bulletBounce');
        this.bulletBounce2Sound = this.game.add.audio('bulletBounce2');
        this.shieldImpactSound = this.game.add.audio('shieldImpact');
        this.fireLaserSound = this.game.add.audio('fireLaser', 0.5);
        this.fireShotgunSound = this.game.add.audio('fireShotgun');
        this.fireMissileSound = this.game.add.audio('fireMissile');
        this.homingMissileTargetChangeSound = this.game.add.audio('homingMissileTargetChange');
        this.homingMissileTargetingSound = this.game.add.audio('homingMissileTargeting');
        this.weaponStoreSound = this.game.add.audio('weaponStore', 0.5);
        this.tankExplosionSound = this.game.add.audio('tankExplosion');
        this.bulletPuffSound = this.game.add.audio('bulletPuff');
        this.chickenOutSound = this.game.add.audio('chickenOut');
        this.shieldWeakenedSound = this.game.add.audio('shieldWeakened');
        this.spawnZoneTearingSound = this.game.add.audio('spawnZoneTear');
        this.spawnZoneUnstableSound = this.game.add.audio('spawnZoneUnstable');

        // Create waiting icon.
        this.waitingIconGroup = this.game.add.existing(new UIWaitingIconGroup(this.game));

        // Create game group to hold all things in the game.
        this.gameGroup = this.game.add.group();

        // Create overlay group to hold all UI which should be above game.
        this.overlayGroup = this.game.add.group();
        this.overlayGroup.fixedToCamera = true;

        // Create overtime counter group.
        this.overtimeGroup = this.overlayGroup.add(new UICounterOvertimeGroup(this.game, this.gameController));

        // Create counter timer group.
        this.counterTimerGroup = this.game.add.group(this.overlayGroup);

        // Add pool of counter timer groups.
        for (var i = 0; i < UIConstants.COUNTER_TIMER_POOL_SIZE; ++i) {
            this.counterTimerGroup.add(new UICounterTimerGroup(this.game, this.gameController));
        }

        // Create round title group.
        this.roundTitleGroup = this.overlayGroup.add(new UIRoundTitleGroup(this.game));

        // Create count down group.
        this.countDownGroup = this.game.add.group(this.overlayGroup);

        // Add pool of count down images.
        for (var i = 0; i < UIConstants.COUNT_DOWN_POOL_SIZE; ++i) {
            this.countDownGroup.add(new UICountDownImage(this.game));
        }

        if (Constants.getMode() == Constants.MODE_CLIENT_ONLINE) {
            // Create delayed leave game sprite if online client.
            this.leaveGameGroup = this.overlayGroup.add(new UILeaveGameButtonGroup(this.game, this.game.width - UIConstants.LEAVE_GAME_MARGIN, UIConstants.LEAVE_GAME_MARGIN, this.gameController));
            this.leaveGameGroup.spawn();
        } else if (Constants.getMode() == Constants.MODE_CLIENT_LOCAL) {
            // Create immediate leave game sprite if local client.
            this.leaveGameGroup = this.overlayGroup.add(new UIButtonGroup(this.game, this.game.width - UIConstants.LEAVE_GAME_MARGIN, UIConstants.LEAVE_GAME_MARGIN, 'Warning', UIConstants.BUTTON_SIZES.MEDIUM, "X", function() {this.gameController.endGame();}, this, 0, Phaser.Keyboard.ESC));
            this.leaveGameGroup.spawn();
        }

        // Create celebration icons.
        this.celebrationTrophyGroup = this.game.add.existing(new UICelebrationTrophyGroup(this.game));

        // Create the groups in the order they should sort:

    	// Create maze floor group.
    	this.mazeFloorGroup = this.game.add.group(this.gameGroup);

        // Create spawn zone group.
        this.spawnZoneGroup = this.game.add.group(this.gameGroup);

        // Create rubble group.
        this.rubbleGroup = this.gameGroup.add(new UIRubbleGroup(this.game));

        // Create dust group.
        this.dustGroup = this.game.add.group(this.gameGroup);

        // Create crate group.
        this.crateGroup = this.game.add.group(this.gameGroup);

        // Create tank group.
        this.tankGroup = this.game.add.group(this.gameGroup);

        // Create gold group.
        this.goldGroup = this.game.add.group(this.gameGroup);

        // Create diamond shine group.
        this.diamondShineGroup = this.game.add.group(this.gameGroup);

        // Create diamond group.
        this.diamondGroup = this.game.add.group(this.gameGroup);

        // Create sparkle group.
        this.sparkleGroup = this.game.add.group(this.gameGroup);

        // Create projectile group.
        this.projectileGroup = this.game.add.group(this.gameGroup);

        // Create missile smoke group.
        this.missileSmokeGroup = this.game.add.group(this.gameGroup);

        // Create missile group.
        this.missileGroup = this.game.add.group(this.gameGroup);

        // Create aimer group.
        this.aimerGroup = this.game.add.group(this.gameGroup);

        // Create laser group.
        this.laserGroup = this.game.add.group(this.gameGroup);

        // Create maze wall group.
    	this.mazeWallGroup = this.game.add.group(this.gameGroup);

    	// Create explosion group.
    	this.explosionGroup = this.game.add.group(this.gameGroup);

        // Create bullet puff group.
        this.bulletPuffGroup = this.game.add.group(this.gameGroup);

        // Create missile launch group.
        this.missileLaunchGroup = this.game.add.group(this.gameGroup);

        // Create tank feather group.
        this.tankFeatherGroup = this.game.add.group(this.gameGroup);

        // Create maze wall decoration group.
        this.mazeWallDecorationGroup = this.game.add.group(this.gameGroup);

        // Create shield group.
        this.shieldGroup = this.game.add.group(this.gameGroup);

        // Create shield spark group.
        this.shieldSparkGroup = this.gameGroup.add(new UIShieldSparkGroup(this.game));

        // Create tank name group.
        this.tankNameGroup = this.game.add.group(this.gameGroup);

        // Create chat symbol group.
        this.chatSymbolGroup = this.game.add.group(this.gameGroup);

        // Create weapon symbol group.
        this.weaponSymbolGroup = this.game.add.group(this.gameGroup);

        // Add dust.
        var dustEmitter = this.dustGroup.add(new UIDustEmitter(this.game));

        // Add missile launch smoke.
        var missileLaunchEmitter = this.missileLaunchGroup.add(new UIMissileLaunchEmitter(this.game));

        // Add pool of spawn zone sprites.
        for (var i = 0; i < UIConstants.SPAWN_ZONE_POOL_SIZE; ++i) {
            this.spawnZoneGroup.add(new UISpawnZoneSprite(this.game, this.gameController, this.spawnZoneTearingSound, this.spawnZoneUnstableSound));
        }

        // Add pool of crates.
        for (var i = 0; i < UIConstants.CRATE_POOL_SIZE; ++i) {
            this.crateGroup.add(new UICrateSprite(this.game, this.gameController, dustEmitter));
        }

        // Add pool of golds.
        for (var i = 0; i < UIConstants.GOLD_POOL_SIZE; ++i) {
            this.goldGroup.add(new UIGoldSprite(this.game, this.gameController, this.sparkleGroup));
        }

        // Add pool of diamond shine effects.
        for (var i = 0; i < UIConstants.DIAMOND_SHINE_POOL_SIZE; ++i) {
            this.diamondShineGroup.add(new UIDiamondShineGroup(this.game));
        }

        // Add pool of diamonds.
        for (var i = 0; i < UIConstants.DIAMOND_POOL_SIZE; ++i) {
            this.diamondGroup.add(new UIDiamondSprite(this.game, this.gameController, this.diamondShineGroup, this.sparkleGroup));
        }

        // Add pool of sparkles.
        for (var i = 0; i < UIConstants.SPARKLE_POOL_SIZE; ++i) {
            this.sparkleGroup.add(new UISparkleImage(this.game))
        }

        // Add pool of projectiles
        for (var i = 0; i < UIConstants.PROJECTILE_POOL_SIZE; ++i) {
            this.projectileGroup.add(new UIProjectileImage(this.game, this.gameController));
        }

        // Add pool of missiles and missile smoke
        for (var i = 0; i < UIConstants.MISSILE_POOL_SIZE; ++i) {
            var missile = this.missileGroup.add(new UIMissileImage(this.game, this.gameController, this.homingMissileTargetingSound));
            var missileSmokeEmitter = this.missileSmokeGroup.add(new UIColouredSmokeEmitter(this.game, missile, UIConstants.MISSILE_SMOKE_COLOUR));
            missile.setSmokeEmitter(missileSmokeEmitter);
        }

        // Add pool of aimers
        for (var i = 0; i < UIConstants.AIMER_POOL_SIZE; ++i) {
            this.aimerGroup.add(new UIAimerGraphics(this.game, this.gameController));
        }

        // Add pool of lasers
        for (var i = 0; i < UIConstants.LASER_POOL_SIZE; ++i) {
            this.laserGroup.add(new UILaserGraphics(this.game, this.gameController));
        }

        // Add pool of tanks.
        for (var i = 0; i < UIConstants.TANK_POOL_SIZE; ++i) {
            this.tankGroup.add(new UITankSprite(this.game, this.gameController, this.fireBulletSound, this.fireLaserSound, this.fireShotgunSound, this.fireMissileSound, this.weaponStoreSound, dustEmitter, missileLaunchEmitter));
        }

        // Add pool of explosions.
        for (var i = 0; i < UIConstants.EXPLOSION_POOL_SIZE; ++i) {
            this.explosionGroup.add(new UIExplosionGroup(this.game, this.tankExplosionSound));
        }

        // Add pool of bullet puffs.
        for (var i = 0; i < UIConstants.BULLET_PUFF_POOL_SIZE; ++i) {
            this.bulletPuffGroup.add(new UIPuffSprite(this.game));
        }

        // Add pool of tank feathers.
        for (var i = 0; i < UIConstants.TANK_FEATHER_POOL_SIZE; ++i) {
            this.tankFeatherGroup.add(new UITankFeatherSprite(this.game));
        }

        // Add pool of shield sprites.
        for (var i = 0; i < UIConstants.SHIELD_POOL_SIZE; ++i) {
            this.shieldGroup.add(new UIShieldSprite(this.game, this.gameController, this.shieldWeakenedSound));
        }

        // Add pool of tank names.
        for (var i = 0; i < UIConstants.TANK_NAME_POOL_SIZE; ++i) {
            this.tankNameGroup.add(new UITankNameGroup(this.game, this.gameController));
        }

        // Add pool of chat symbol sprites.
        for (var i = 0; i < UIConstants.CHAT_SYMBOL_POOL_SIZE; ++i) {
            this.chatSymbolGroup.add(new UIChatSymbolImage(this.game, this.gameController));
        }

        // Add pool of weapon symbol stacks.
        for (var i = 0; i < UIConstants.WEAPON_SYMBOL_POOL_SIZE; ++i) {
            this.weaponSymbolGroup.add(new UIWeaponSymbolGroup(this.game, this.gameController));
        }

        // Create debug graphics.
        this.debugGraphics = this.game.add.graphics(0, 0, this.gameGroup);

        // Create round time text.
        this.roundTimeText = this.game.add.text(UIConstants.ROUND_TIMER_OFFSET_X, UIConstants.ROUND_TIMER_OFFSET_Y, "", {
            font: "bold " + UIConstants.ROUND_TIMER_FONT_SIZE + "px monospace",
            fill: "#ffffff"
        });
        this.roundTimeText.setShadow(0, 0, "#000000", UIConstants.ROUND_TIMER_SHADOW_BLUR)
        this.elapsedTime = 0;

        // Reset QualityManager.
        QualityManager.reset();

        // Register game controller with GameManager.
        GameManager.setGameController(this.gameController);

        // Add event listeners.
        this.gameController.addGameEventListener(this._gameEventHandler, this);
        this.gameController.addRoundEventListener(this._roundEventHandler, this);

        ClientManager.getClient().addEventListener(this._clientEventHandler, this);

        if (Constants.getMode() == Constants.MODE_CLIENT_ONLINE) {
            // Only set up client state listener if online client.
            ClientManager.getClient().addStateChangeListener(this._clientStateChangeHandler, this);

            // Try and request first maze. It might not be ready at this point if the game is newly created.
            ClientManager.getClient().requestMaze();

            // Try and set up game state and expanded round state.
            var gameState = ClientManager.getClient().getGameState();
            if (gameState) {
                this.gameController.setGameState(gameState);
            }
            var expandedRoundState = ClientManager.getClient().getExpandedRoundState();
            if (expandedRoundState) {
                this.gameController.setRoundState(expandedRoundState);
            }
        } else if (Constants.getMode() == Constants.MODE_CLIENT_LOCAL) {
            // Only set up users listener if local client.
            Users.addEventListener(this._authenticationEventHandler, this);
        }

        this.game.onFocus.add(this._onFocusHandler, this);
        this.game.onBlur.add(this._onBlurHandler, this);

        this.scale.onSizeChange.add(this._onSizeChangeHandler, this);

        // State.
        this.waitingTime = 0;
        this.betweenRoundsDuration = 0;
        this.roundEnded = false;
        this.celebrationDuration = UIConstants.WAITING_FOR_CELEBRATION_TIME;
        this.roundTitleDelayDuration = 0;
        this.roundTitleShown = false;
        this.nextVictoryAward = null;
        this.cameraShake = 0;

    },

    shutdown: function() {
        // Retire the UI.
        this._retireUI();

        // Remove event listeners.
        this.gameController.removeGameEventListener(this._gameEventHandler, this);
        this.gameController.removeRoundEventListener(this._roundEventHandler, this);

        ClientManager.getClient().removeEventListener(this._clientEventHandler, this);

        if (Constants.getMode() == Constants.MODE_CLIENT_ONLINE) {
            // Only take down client state listener if online client.
            ClientManager.getClient().removeStateChangeListener(this._clientStateChangeHandler, this);
        } else if (Constants.getMode() == Constants.MODE_CLIENT_LOCAL) {
            // Only take down users listener if local client.
            Users.removeEventListener(this._authenticationEventHandler, this);
            // Only remove all AI managers if local client.
            AIs.removeAllAIManagers();
        }

        this.game.onFocus.remove(this._onFocusHandler, this);
        this.game.onBlur.remove(this._onBlurHandler, this);

        this.scale.onSizeChange.remove(this._onSizeChangeHandler, this);
    },

    _onFocusHandler: function(event) {
        this.log.debug("FOCUS!");
        // Remove focus from other UI elements that might grab it upon refocusing of the page.
        // FIXME Perhaps pass a general UI object to which has its own blur method so the gamestate does need to know each UI component.
        var self = this;
        setTimeout(function() {
            TankTrouble.ChatBox.blur();
        }, 100);
    },

    _onBlurHandler: function(event) {
        this.log.debug("BLUR!");
    },

    _onSizeChangeHandler: function() {
        this.log.debug("SIZE CHANGE!");
        var localBounds = this.gameGroup.getLocalBounds();
        var unscaledMazeWidth = localBounds.width;
        var unscaledMazeHeight = localBounds.height;
        var unscaledMazeOffsetX = -localBounds.x;
        var unscaledMazeOffsetY = -localBounds.y;

        // Leave a small gap on the sides, and a larger one at the bottom.
        // Do not scale up more than 2x.
        var gameScale = Math.min(2.0, Math.min((this.game.width - UIConstants.MAZE_SIDE_MARGIN) / unscaledMazeWidth, (this.game.height - UIConstants.MAZE_BOTTOM_MARGIN - UIConstants.MAZE_TOP_MARGIN) / unscaledMazeHeight));
        // Round the scale to a whole percent.
        gameScale = Math.floor(gameScale * 100.0) / 100.0;
        this.gameGroup.scale.set(gameScale, gameScale);
        // FIXME: Do the rest of the adaptive layout.
        // Place the maze at a whole pixel.
        this.gameGroup.position.set(Math.ceil((this.game.width - this.gameGroup.width) * 0.5 + unscaledMazeOffsetX * gameScale), Math.ceil(UIConstants.MAZE_TOP_MARGIN + unscaledMazeOffsetY * gameScale));

        this.overtimeGroup.position.x = this.game.width / 2.0;

        this.counterTimerGroup.position.x = this.game.width / 2.0;

        this.roundTitleGroup.position.set(this.game.width / 2.0, this.game.height / 2.0 + UIConstants.ROUND_TITLE_OFFSET);

        this.countDownGroup.position.set(this.game.width / 2.0, this.game.height / 2.0);

        this.leaveGameGroup.position.x = this.game.width - UIConstants.LEAVE_GAME_MARGIN;

        this.waitingIconGroup.position.set(this.game.width / 2.0, this.game.height / 3.0);

        this.celebrationTrophyGroup.position.set(this.game.width / 2.0, this.game.height / 2.0);
    },

    update: function() {
        // Handle online client specific things.
        if (Constants.getMode() == Constants.MODE_CLIENT_ONLINE) {
            this.celebrationDuration += this.game.time.physicsElapsedMS;

            // Show round title if it has not been shown within delay, indicating that the player joined mid-round.
            if (!this.roundTitleShown && !this.roundEnded && this.maze) {
                this.roundTitleDelayDuration += this.game.time.physicsElapsedMS;
                if (this.roundTitleDelayDuration > UIConstants.WAITING_FOR_ROUND_TITLE_TIME) {
                    this._spawnRoundTitle(UIConstants.GAME_MODE_NAME_INFO[this.gameController.getMode()].NAME, this.gameController.getRanked());
                }
            }

            // Clean up the maze if staying between rounds for too long, indicating that no other players are ready for battle.
            if (this.roundEnded && this.maze) {
                this.betweenRoundsDuration += this.game.time.physicsElapsedMS;
                if (this.betweenRoundsDuration > UIConstants.WAITING_FOR_MAZE_REMOVAL_TIME) {
                    this._cleanUp();
                }
            } else {
                this.betweenRoundsDuration = 0;
            }

            // If no maze is showing for a while, show waiting icon.
            if (!this.maze && this.celebrationDuration > UIConstants.WAITING_FOR_CELEBRATION_TIME) {
                this.waitingTime += this.game.time.physicsElapsedMS;
                if (this.waitingTime >= UIConstants.WAITING_FOR_PLAYERS_DELAY_TIME && !this.waitingIconGroup.exists) {
                    // Clean up any potential celebrations.
                    this._cleanUp();

                    var message;
                    var header = UIConstants.GAME_MODE_NAME_INFO[this.gameController.getMode()].NAME;
                    var iconFrame = UIConstants.GAME_MODE_NAME_INFO[this.gameController.getMode()].ICON;
                    if (this.gameController.getTotalPlayerCount() < Constants.GAME_MODE_INFO[this.gameController.getMode()].MIN_PLAYERS) {
                        message = "Waiting for more players";
                    } else {
                        message = "Waiting for next round";
                    }
                    this.waitingIconGroup.spawn(this.game.width / 2.0, this.game.height / 3.0, true, message, header, iconFrame);
                }
            } else {
                this.waitingTime = 0;
                if (this.waitingIconGroup.exists) {
                    this.waitingIconGroup.remove();
                }
            }
        }

        QualityManager.update();
        Inputs.update();
        AIs.update(this.game.time.physicsElapsedMS);
        this.gameController.update();
        this.updateRoundTime();

    	if (this.cameraShake >= 0)
    	{
            var shakeX = Math.random() * this.cameraShake - this.cameraShake / 2.0;
            var shakeY = Math.random() * this.cameraShake - this.cameraShake / 2.0;

            this.game.world.setBounds(shakeX, shakeY, this.game.width + shakeX, this.game.height + shakeY);
    		this.cameraShake -= UIConstants.CAMERA_SHAKE_FADE;
    	}

        var tanks = this.gameController.getTanks();
        for (var tank in tanks) {
            if (Math.random() > UIConstants.INVERSE_RUBBLE_SPAWN_PROBABILITY_IN_THE_OPEN) {
                this._spawnRubble(tanks[tank]);
            }
        }

        //this._debugDrawB2DWorld(this.gameController.getB2DWorld());
        //this._debugDrawWorld(this.game.world);
        // FIXME Wrap the following in _debugDrawAI
        /*if (this.gameController.getMaze()) {
            var position = null;
            for (var tank in tanks) {
                position = {x: Math.floor(tanks[tank].getX()/Constants.MAZE_TILE_SIZE.m), y: Math.floor(tanks[tank].getY()/Constants.MAZE_TILE_SIZE.m)};
                break;
            }
            if (position !== null) {
                var distances = this.gameController.getMaze().getDistancesFromPosition(position);
                if (distances) {
                    this._debugDrawMazeMap(distances, 0, 18, 0x00ff00, 0xff0000, 0.8);
                }
            }
        }*/
        /*if (this.gameController.getMaze()) {
            this._debugDrawMazeMap(this.gameController.getMaze().getDeadEndPenalties(), 0, Constants.MAZE_MAX_DEAD_END_PENALTY, 0xff0000, 0x00ff00, 0.8);
        }*/
        /*if (this.gameController.getMaze()) {
            var startPosition = null;
            var endPosition = null;
            for (var tank in tanks) {
                if (startPosition === null) {
                    startPosition = {x: Math.floor(tanks[tank].getX()/Constants.MAZE_TILE_SIZE.m), y: Math.floor(tanks[tank].getY()/Constants.MAZE_TILE_SIZE.m)};
                }
                else if (endPosition === null) {
                    endPosition = {x: Math.floor(tanks[tank].getX()/Constants.MAZE_TILE_SIZE.m), y: Math.floor(tanks[tank].getY()/Constants.MAZE_TILE_SIZE.m)};
                }
            }

            if (startPosition !== null && endPosition !== null) {
                this._debugDrawMazePath(this.gameController.getMaze().getShortestPathWithGraph(startPosition, endPosition, undefined, 1.0), 8, 0x00ff00, 0xff0000);
            }
        }*/
        /*if (this.gameController.getMaze()) {
            var startPosition = null;
            var fromPosition = null;
            for (var tank in tanks) {
                if (startPosition === null) {
                    startPosition = {x: Math.floor(tanks[tank].getX()/Constants.MAZE_TILE_SIZE.m), y: Math.floor(tanks[tank].getY()/Constants.MAZE_TILE_SIZE.m)};
                }
                else if (fromPosition === null) {
                    fromPosition = {x: Math.floor(tanks[tank].getX()/Constants.MAZE_TILE_SIZE.m), y: Math.floor(tanks[tank].getY()/Constants.MAZE_TILE_SIZE.m)};
                }
            }

            if (startPosition !== null && fromPosition !== null) {
                this._debugDrawMazePath(this.gameController.getMaze().getPathAwayFrom(startPosition, fromPosition, 10, 1), 8, 0x00ff00, 0xff0000);
            }
        }*/
        /*if (this.gameController.getMaze()) {
            var projectiles = this.gameController.getProjectiles();
            for (var projectile in projectiles) {
                // FIXME Take remaining lifetime into account? Probably do it from the caller.
                //        remainingLength = Math.min(maxLength, currentDirection.Length() * (projectile.lifetime - projectile.getTimeAlive()));
                this._debugDrawPath(B2DUtils.calculateProjectilePath(this.gameController.getB2DWorld(), projectiles[projectile], 8, Constants.MAZE_TILE_SIZE.m * 10, false), 5, 0xffff00, 0xdddd00);
                break;
            }
        }*/
        /*if (this.gameController.getMaze()) {
            var selectedTank = null;
            var endPosition = null;
            for (var tank in tanks) {
                selectedTank = tanks[tank];
                break;
            }
            if (selectedTank !== null) {
                var position = {x: Math.floor(selectedTank.getX()/Constants.MAZE_TILE_SIZE.m), y: Math.floor(selectedTank.getY()/Constants.MAZE_TILE_SIZE.m)};

                var maze = this.gameController.getMaze();
                var threatMap = MazeMap.create(maze.getWidth(), maze.getHeight(), 0);
                var projectiles = this.gameController.getProjectiles();
                for (var projectile in projectiles) {
                    var projectilePath = B2DUtils.calculateProjectilePath(this.gameController.getB2DWorld(), projectiles[projectile], 8, Constants.MAZE_TILE_SIZE.m * 10, false);
                    B2DUtils.splatPathUntoMazeMap(threatMap, projectilePath, Constants.MAZE_TILE_SIZE.m * 0.1, function (tile, length, stepSize) {
                        var distance = maze.getDistanceBetweenPositions(tile, position);
                        if (distance === false) {
                            return 0;
                        }

                        var projectileTimeToHere = length / new Phaser.Point(projectiles[projectile].getSpeedX(), projectiles[projectile].getSpeedY()).getMagnitude();
                        var tankTimeToHere = distance * Constants.MAZE_TILE_SIZE.m / Constants.TANK.FORWARD_SPEED.m;

                        return Math.min(1, Math.max(0, 1 - Math.abs(projectileTimeToHere - tankTimeToHere) * 0.25)) * 0.2 * stepSize;
                    });
                }
                for (var tank in tanks) {
                    if (tanks[tank] !== selectedTank) {
                        var firingPath = B2DUtils.calculateFiringPath(this.gameController.getB2DWorld(), tanks[tank], 0, 4, Constants.MAZE_TILE_SIZE.m * 4, false);
                        B2DUtils.splatPathUntoMazeMap(threatMap, firingPath, Constants.MAZE_TILE_SIZE.m * 0.1, function (tile, length, stepSize) {
                            return (1.0 - length / (Constants.MAZE_TILE_SIZE.m * 4)) * 0.2 * stepSize;
                        });
                        if (endPosition === null) {
                            endPosition = {x: Math.floor(tanks[tank].getX()/Constants.MAZE_TILE_SIZE.m), y: Math.floor(tanks[tank].getY()/Constants.MAZE_TILE_SIZE.m)};
                        }
                    }
                }
                this._debugDrawMazeMap(threatMap.data(), 0, 6, 0x00ff00, 0xff0000, 0.8);
                if (endPosition !== null) {
                    this._debugDrawMazePath(this.gameController.getMaze().getShortestPathWithGraph(position, endPosition, threatMap.data(), 0.1), 8, 0x00ff00, 0xff0000, false);
                }
            }
        }*/
        /*if (this.gameController.getMaze()) {
            for (var tank in tanks) {
                this._debugDrawPath(B2DUtils.calculateFiringPath(this.gameController.getB2DWorld(), tanks[tank], 0, 4, Constants.MAZE_TILE_SIZE.m * 10, false), 5, 0x00ff00, 0x00aa00);
                break;
            }
        }*/
    },

    render: function() {
        if (this.game.debug.text) {
            this.game.debug.text(this.game.time.fps, 2, 14, "#000000");
        }
    },

    updateRoundTime: function() {
        if (this.elapsedTime > 0) {
            this.elapsedTime += this.game.time.physicsElapsedMS;

            var ms = Math.floor((this.elapsedTime % 1000) / 10) + "";
            var sec = Math.floor((this.elapsedTime / 1000) % 60) + "";
            var min = Math.floor((this.elapsedTime / (1000 * 60)) % 60) + "";

            this.roundTimeText.text = (" " + min + sec.padStart(3, ":00") + ms.padStart(3, ":00") + " ");
        }
    },

    getTankSprite: function(playerId) {
        return this.tankSprites[playerId];
    },

    _getTankPosition: function(playerId) {
        if (playerId in this.tankSprites) {
            var tank = this.tankSprites[playerId];

            var gameBounds = this.game.scale.bounds;
            var position = tank.toGlobal(new Phaser.Point(0, 0));

            // Scale from game canvas position to pixel position.
            Phaser.Point.divide(position, this.game.scale.scaleFactor, position);

            return {x: gameBounds.x + position.x, y: gameBounds.y + position.y};
        }

        return undefined;
    },

    _getCollectiblePositionAngleAndScale: function(collectibleId) {
        if (collectibleId in this.collectibles) {
            var collectible = this.collectibles[collectibleId];

            var gameBounds = this.game.scale.bounds;
            var position = collectible.toGlobal(new Phaser.Point(0, 0));

            // Scale from game canvas position to pixel position.
            Phaser.Point.divide(position, this.game.scale.scaleFactor, position);

            var extraInfo = collectible.getExtraPositionInfo();
            var scale = collectible.worldScale.x / UIConstants.GAME_ASSET_SCALE;
            return {x: gameBounds.x + position.x, y: gameBounds.y + position.y, angle: collectible.angle, scale: scale, extraInfo: extraInfo};
        }

        return undefined;
    },

    _retireUI: function() {
        // Retire leave game group.
        this.leaveGameGroup.retire();

        // Clean up remaining UI.
        this._cleanUp();
        // FIXME: Finish retirement.
    },

    _gameEventHandler: function(self, id, evt, data) {
        self.log.debug("Game " + id + ": " + evt + ": " + data);
        switch (evt) {
            case GameModel._EVENTS.COUNT_DOWN:
            {
                if (data === Constants.COUNTDOWN_START_VALUE) {
                    self._spawnRoundTitle(UIConstants.GAME_MODE_NAME_INFO[self.gameController.getMode()].NAME, self.gameController.getRanked());
                }

                self._spawnCountDown(data);
                break;
            }
            case GameModel._EVENTS.GAME_ENDED:
            {
                self._leaveState();
                break;
            }
        }
    },

    _roundEventHandler: function(self, id, evt, data) {
        self.log.debug("Round " + id + ": " + evt + ": " + data);
        switch (evt) {
            case RoundModel._EVENTS.CELEBRATION_STARTED:
            {
                // Clean up any previous round.
                self._cleanUp();

                // Joining the game after ROUND_ENDED and before CELEBRATION_STARTED causes nextVictoryAward to be null.
                if (self.nextVictoryAward) {
                    // Reset celebration duration.
                    self.celebrationDuration = 0.0;

                    // Create celebration.
                    self._spawnCelebration(UIConstants.GAME_MODE_NAME_INFO[self.gameController.getMode()].NAME, self.nextVictoryAward);
                }

                break;
            }
            case RoundModel._EVENTS.ROUND_CREATED:
            {
                // Clean up any previous round or celebration.
                self._cleanUp();

                // Reset round ended.
                self.roundEnded = false;

                // Reset next victory award.
                self.nextVictoryAward = null;

                break;
            }
            case RoundModel._EVENTS.ROUND_STARTED:
            {
                self.elapsedTime = 1;
                Inputs.reset();
                AIs.reset();
                self._spawnCountDown(0);
                break;
            }
            case RoundModel._EVENTS.ROUND_ENDED:
            {
                // Mark round as ended.
                self.roundEnded = true;
                self.elapsedTime = 0;

                // If game mode has celebration ceremony, store award for later. Otherwise, hand it out right away.
                if (Constants.GAME_MODE_INFO[self.gameController.getMode()].HAS_CELEBRATION) {
                    self.nextVictoryAward = data;
                } else {
                    for (var i = 0; i < data.getPlayerIds().length; ++i) {
                        var playerId = data.getPlayerIds()[i];
                        GameManager.sendVictoryGoldToTank(playerId, data.getGoldAmountPerWinner(), self._getTankPosition(playerId));
                        GameManager.showXPChange(data.getExperiencePerWinner(), UIPlayerPanel.getLocalTankIconPosition(playerId), self.gameController.getRanked() ? 1200 : 0);
                    }

                    UIPlayerPanel.showRankChanges(data.getRankChanges());
                }

                // Freeze all UI specific animations such as smoke, puffs and explosions (and particles).
                self.game.physics.arcade.isPaused = true;
                // Freeze all UI p2 physics.
                self.game.physics.p2.paused = true;
                // Freeze all currently running tweens.
                self.game.tweens.removeAll();
                // FIXME Stop all playing sounds.
                // self.game.sound.stopAll();
                // FIXME Move game music out of Phaser.
                // FIXME Freeze all currently running animations.

                if (IFrameManager.shouldNag()) {
                    // Show iframe overlay.
                    OverlayManager.enqueueOverlay(
                        TankTrouble.MessageOverlay,
                        {
                            headline: 'Embedding detected',
                            message: "We hope you are enjoying TankTrouble!<br/><br/>This site has embedded the game without permission, thereby stealing our revenue, which pays for the development and servers.<br/>Please go to the original site to show your support and enjoy the game as it was intended.<br/><button class=\"medium\" type=\"button\" onclick=\"window.open(window.self.location, \'_blank\');\">Go to TankTrouble.com</button><br/>Thanks for playing!",
                            canCancel: false
                        }
                    );

                    IFrameManager.updateLastNagTime();
                }

                break;
            }
            case RoundModel._EVENTS.MAZE_SET:
            {
                if (!self.maze) {
                    self.maze = data;
                    self._createMaze(data);
                    self._updateTheme(data.getTheme());
                    // Scale the maze correctly.
                    // FIXME Is this the cool way to handle this?
                    self._onSizeChangeHandler();
                } else {
                    self.log.debug("Attempt to set new maze when maze was already set.");
                }
                break;
            }
            case RoundModel._EVENTS.TANK_CHANGED:
            {
                if (Constants.getMode() == Constants.MODE_CLIENT_ONLINE) {
                    ClientManager.getClient().setTankState(data);
                }
                break;
            }
            case RoundModel._EVENTS.TANK_CREATED:
            {
                var smoothing = Users.isAnyUser(data.getPlayerId()) || Constants.getMode() == Constants.MODE_CLIENT_LOCAL ? UIConstants.TANK_LOCAL_SMOOTHING : UIConstants.TANK_ONLINE_SMOOTHING;
                self._createTank(data, self.gameController.getInitialRoundStateReceived(), smoothing);
                break;
            }
            case RoundModel._EVENTS.TANK_DESTROYED:
            {
                if (self._removeTank(data)) {
                    self._spawnTankExplosion(data);
                    self._addCameraShake(UIConstants.TANK_EXPLOSION_CAMERA_SHAKE);
                }
                break;
            }
            case RoundModel._EVENTS.TANK_KILLED:
            {
                if (self._removeTank(data.getVictimPlayerId())) {
                    self._spawnTankExplosion(data.getVictimPlayerId());
                    self._addCameraShake(UIConstants.TANK_EXPLOSION_CAMERA_SHAKE);
                    GameManager.showXPChange(data.getExperience(), UIPlayerPanel.getLocalTankIconPosition(data.getKillerPlayerId()), 0);
                }
                break;
            }
            case RoundModel._EVENTS.TANK_CHICKENED_OUT:
            {
                var tankPosition = self._getTankPosition(data.getPlayerId());

                if (self._removeTank(data.getPlayerId())) {
                    self._spawnTankFeathers(data.getPlayerId(), tankPosition);
                }

                var projectileIds = data.getProjectileIds();
                for (var i = 0; i < projectileIds.length; ++i) {
                    self._removeProjectile(projectileIds[i]);
                }

                // FIXME Remove all other active weapons of this tank.
                break;
            }
            case RoundModel._EVENTS.PROJECTILE_CREATED:
            {
                self._createProjectile(data);
                break;
            }
            case RoundModel._EVENTS.PROJECTILE_DESTROYED:
            {
                self._removeProjectile(data);
                break;
            }
            case RoundModel._EVENTS.PROJECTILE_TIMEOUT:
            {
                self._removeProjectile(data);
                self._spawnProjectilePuffs(data);
                break;
            }
            case RoundModel._EVENTS.COLLECTIBLE_CREATED:
            {
                // Only play animation and sound if collectible is new. Otherwise, it will also play when someone joins in the middle of a battle.
                self._createCollectible(data, self.gameController.getInitialRoundStateReceived());
                break;
            }
            case RoundModel._EVENTS.COLLECTIBLE_DESTROYED:
            {
                self._startCollectibleAnimation(data);
                self._removeCollectible(data.getCollectibleId());
                break;
            }
            case RoundModel._EVENTS.TANK_SHIELD_COLLISION:
            {
                var shieldedTank = self.gameController.getTank(data.shieldA.getPlayerId());
                if (shieldedTank) {
                    if (Math.random() > UIConstants.INVERSE_SHIELD_SPARK_PROBABILITY_IN_COLLISION) {
                        self._bounceTankOnShield(data.tankA, shieldedTank, data.collisionPoint, true);
                    }
                    if (Math.random() > UIConstants.INVERSE_RUBBLE_SPAWN_PROBABILITY_IN_COLLISION) {
                        self._spawnRubble(data.tankA);
                    }
                }
                break;
            }
            case RoundModel._EVENTS.PROJECTILE_SHIELD_COLLISION:
            {
                var shieldedTank = self.gameController.getTank(data.shieldA.getPlayerId());
                if (shieldedTank) {
                    self._bounceProjectileOnShield(data.projectile, shieldedTank, data.collisionPoint);
                }
                break;
            }
            case RoundModel._EVENTS.PROJECTILE_ZONE_COLLISION:
            {
                // FIXME: Handle.
                break;
            }
            case RoundModel._EVENTS.SHIELD_SHIELD_COLLISION:
            {
                var shieldedTankA = self.gameController.getTank(data.shieldA.getPlayerId());
                var shieldedTankB = self.gameController.getTank(data.shieldB.getPlayerId());
                if (shieldedTankA && shieldedTankB) {
                    if (Math.random() > UIConstants.INVERSE_SHIELD_SPARK_PROBABILITY_IN_COLLISION) {
                        if (Math.random() > 0.5) {
                            self._bounceTankOnShield(shieldedTankA, shieldedTankB, data.collisionPoint, false);
                        } else {
                            self._bounceTankOnShield(shieldedTankB, shieldedTankA, data.collisionPoint, false);
                        }
                    }
                    if (Math.random() > UIConstants.INVERSE_RUBBLE_SPAWN_PROBABILITY_IN_COLLISION) {
                        self._spawnRubble(shieldedTankA);
                        self._spawnRubble(shieldedTankB);
                    }
                }
                break;
            }
            case RoundModel._EVENTS.SHIELD_ZONE_COLLISION:
            {
                // FIXME: Handle.
                break;
            }
            case RoundModel._EVENTS.PROJECTILE_MAZE_COLLISION:
            {
                self._bounceProjectileOnMaze(data.projectile, data.collisionPoint);
                break;
            }
            case RoundModel._EVENTS.TANK_MAZE_COLLISION:
            {
                if (Math.random() > UIConstants.INVERSE_RUBBLE_SPAWN_PROBABILITY_IN_COLLISION) {
                    self._spawnRubble(data.tankA);
                }
                break;
            }
            case RoundModel._EVENTS.TANK_TANK_COLLISION:
            {
                if (Math.random() > UIConstants.INVERSE_RUBBLE_SPAWN_PROBABILITY_IN_COLLISION) {
                    self._spawnRubble(data.tankA);
                    self._spawnRubble(data.tankB);
                }
                break;
            }
            case RoundModel._EVENTS.TANK_ZONE_COLLISION:
            {
                // FIXME: Handle.
                break;
            }
            case RoundModel._EVENTS.WEAPON_CREATED:
            {
                // Only play animation and sound if weapon is new. Otherwise, it will also play when someone joins in the middle of a battle.
                self._createWeapon(data, self.gameController.getInitialRoundStateReceived());
                self._showWeaponSymbol(data.getPlayerId());
                break;
            }
            case RoundModel._EVENTS.WEAPON_DESTROYED:
            {
                self._removeWeapon(data.getPlayerId());
                self._showWeaponSymbol(data.getPlayerId());
                break;
            }
            case RoundModel._EVENTS.UPGRADE_CREATED:
            {
                // Only play animation and sound if upgrade is new. Otherwise, it will also play when someone joins in the middle of a battle.
                self._createUpgrade(data, self.gameController.getInitialRoundStateReceived());
                break;
            }
            case RoundModel._EVENTS.UPGRADE_DESTROYED:
            {
                self._removeUpgrade(data.getUpgradeId());
                break;
            }
            case RoundModel._EVENTS.COUNTER_CREATED:
            {
                // Only play animation and sound if upgrade is new. Otherwise, it will also play when someone joins in the middle of a battle.
                self._createCounter(data, self.gameController.getInitialRoundStateReceived());
                break;
            }
            case RoundModel._EVENTS.COUNTER_DESTROYED:
            {
                self._removeCounter(data);
                break;
            }
            case RoundModel._EVENTS.ZONE_CREATED:
            {
                // Only play animation and sound if zone is new. Otherwise, it will also play when someone joins in the middle of a battle.
                self._createZone(data, self.gameController.getInitialRoundStateReceived());
                break;
            }
            case RoundModel._EVENTS.ZONE_DESTROYED:
            {
                self._removeZone(data);
                break;
            }
            case Weapon._EVENTS.WEAPON_FIRED:
            {
                self._fireWeapon(data.getPlayerId());
                break;
            }
            case Weapon._EVENTS.HOMING_MISSILE_TARGET_CHANGED: // FIXME Maybe create generic PROJECTILE_UPDATED ?
            {
                self._updateHomingMissileTarget(data.getProjectileId(), data.getTargetId());
                break;
            }
            case Upgrade._EVENTS.UPGRADE_ACTIVATED:
            {
                self._activateUpgrade(data);
                break;
            }
            case Upgrade._EVENTS.UPGRADE_WEAKENED:
            {
                self._weakenUpgrade(data);
                break;
            }
            case Upgrade._EVENTS.UPGRADE_STRENGTHENED:
            {
                self._strengthenUpgrade(data);
                break;
            }
            case Zone._EVENTS.ZONE_ENTERED:
            case Zone._EVENTS.ZONE_LEFT:
            {
                // FIXME Handle.
                break;
            }
            case Zone._EVENTS.ZONE_DESTABILIZED:
            {
                self._destabilizeZone(data);
                break;
            }
        }
    },

    _cleanUp: function() {
        // Clean up previous maze.
        this.mazeFloorGroup.removeAll(true);
        this.mazeWallGroup.removeAll(true);
        this.mazeWallDecorationGroup.removeAll(true);
        this.maze = null;

        // Clean up previous tanks.
        this.tankGroup.callAll('retire');
        this.tankSprites = {};

        // Clean up previous projectiles.
        this.projectiles = {};
        this.projectileGroup.callAll('retire');
        this.missileGroup.callAll('retire');
        this.missileSmokeGroup.callAll('retire');
        this.laserGroup.callAll('retire');

        // Clean up previous rubble.
        this.rubbleGroup.retire();

        // Clean up previous dust.
        this.dustGroup.callAll('retire');

        // Clean up previous collectibles.
        this.collectibles = {};
        this.crateGroup.callAll('retire');
        this.goldGroup.callAll('retire');
        this.diamondGroup.callAll('retire');

        // Clean up previous upgrades.
        this.upgrades = {};
        this.aimerGroup.callAll('retire');
        this.shieldGroup.callAll('retire');

        // Clean up previous counters.
        this.counters = {};
        this.overtimeGroup.retire();
        this.counterTimerGroup.callAll('retire');

        // Clean up previous zones.
        this.zones = {};
        this.spawnZoneGroup.callAll('retire');

        // Clean up previous shines and sparkles.
        this.diamondShineGroup.callAll('retire');
        this.sparkleGroup.callAll('retire');

        // Clean up previous explosions.
        this.explosionGroup.callAll('retire');

        // Clean up previous feathers.
        this.tankFeatherGroup.callAll('retire');

        // Clean up previous bullet puffs.
        this.bulletPuffGroup.callAll('retire');

        // Clean up previous missile launch smoke.
        this.missileLaunchGroup.callAll('retire');

        // Clean up previous shield sparks.
        this.shieldSparkGroup.retire();

        // Clean up overlay UI.
        this.roundTitleGroup.retire();
        this.countDownGroup.callAll('retire');
        this.tankNameGroup.callAll('retire');
        this.chatSymbolGroup.callAll('retire');
        this.chatSymbolSprites = {};
        this.weaponSymbolGroup.callAll('retire');
        this.weaponSymbolGroups = {};

        // Clean up celebration UI.
        this.celebrationTrophyGroup.retire();

        // Clean up UI physics.
        // NOT necessary as killing the associated sprites removes the bodies from the world!
        // EXCEPT! The maze bodies do NOT have associated sprites, so they need to be removed manually!
        var bodies = this.game.physics.p2.getBodies();
        for (var i = 0; i < bodies.length; ++i) {
            if (bodies[i]) {
                this.game.physics.p2.removeBody(bodies[i]);
            }
        }
        // Unpause UI physics.
        this.game.physics.arcade.isPaused = false;
        this.game.physics.p2.paused = false;

        // Do NOT use clear as it removes contact materials, contact handlers, etc.!
        //this.game.physics.p2.clear();
        // Reinitialize stuff that was cleared (contact materials, contact handlers, etc.)
        //UIUtils.initUIPhysics(this.game);
    },

    _createMaze: function(maze) {
        //FIXME Wrap maze in uimazegroup.js

        // Create graphics.
        var theme = maze.getTheme();
        var borders = maze.getBorders();
        var floors = maze.getFloors();
        var spaces = maze.getSpaces();
        var walls = maze.getWalls();
        var wallDecorations = maze.getWallDecorations();

        for (var i = 0; i < borders.length; ++i) {
            var border = borders[i];

            var borderImage = 'border' + theme + '-' + border.number;
            var sprite = this.mazeFloorGroup.create((border.x + 0.5 + border.offsetX) * Constants.MAZE_TILE_SIZE.px, (border.y + 0.5 + border.offsetY) * Constants.MAZE_TILE_SIZE.px, 'game', borderImage);
            sprite.scale.setTo(UIConstants.GAME_ASSET_SCALE * (border.flip ? -1 : 1), UIConstants.GAME_ASSET_SCALE);
            sprite.anchor.setTo(0.5, 1.0);
            sprite.rotation = border.rotation;
        }

        for (var i = 0; i < floors.length; ++i) {
            var floor = floors[i];

            var floorImage = 'floor' + theme + '-' + floor.number;

            var sprite = this.mazeFloorGroup.create((floor.x + 0.5) * Constants.MAZE_TILE_SIZE.px, (floor.y + 0.5) * Constants.MAZE_TILE_SIZE.px, 'game', floorImage);
            sprite.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);
            sprite.anchor.setTo(0.5, 0.5);
            sprite.rotation = floor.rotation;
        }

        for (var i = 0; i < wallDecorations.length; ++i) {
            var wallDecoration = wallDecorations[i];

            var wallDecorationImage = 'wallDecoration' + theme + '-' + wallDecoration.number;

            var sprite = this.mazeWallDecorationGroup.create((wallDecoration.x + 0.5) * Constants.MAZE_TILE_SIZE.px, (wallDecoration.y + 0.5) * Constants.MAZE_TILE_SIZE.px, 'game', wallDecorationImage);
            sprite.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);
            sprite.anchor.setTo(0.5, 0.5);
            sprite.rotation = wallDecoration.rotation;
        }

        for (var i = 0; i < spaces.length; ++i) {
            var space = spaces[i];

            var spaceImage = 'space' + theme + '-' + space.number;

            var sprite = this.mazeFloorGroup.create((space.x + 0.5) * Constants.MAZE_TILE_SIZE.px, (space.y + 0.5) * Constants.MAZE_TILE_SIZE.px, 'game', spaceImage);
            sprite.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);
            sprite.anchor.setTo(0.5, 0.5);
            sprite.rotation = space.rotation;
        }

        for (var i = 0; i < walls.length; ++i) {
            var wall = walls[i];

            var wallImage = 'wall' + theme + '-' + wall.number;

            var sprite = this.mazeWallGroup.create((wall.x + 0.5 + wall.offsetX) * Constants.MAZE_TILE_SIZE.px, (wall.y + 0.5 + wall.offsetY) * Constants.MAZE_TILE_SIZE.px, 'game', wallImage);
            sprite.anchor.setTo(0.5, 0.5);
            sprite.scale.setTo(UIConstants.GAME_ASSET_SCALE * (wall.flipX ? -1 : 1), UIConstants.GAME_ASSET_SCALE * (wall.flipY ? -1 : 1));
            sprite.rotation = wall.rotation;

            // Set up UI Physics body.
            var wallBody = new Phaser.Physics.P2.Body(this.game, null, (wall.x + 0.5 + wall.offsetX) * Constants.MAZE_TILE_SIZE.px, (wall.y + 0.5 + wall.offsetY) * Constants.MAZE_TILE_SIZE.px);
            wallBody.setRectangle(Constants.MAZE_TILE_SIZE.px + Constants.MAZE_WALL_WIDTH.px, Constants.MAZE_WALL_WIDTH.px, 0.0, 0.0, wall.rotation);
            wallBody.dynamic = false;
            wallBody.setMaterial(UIUtils.wallMaterial);
            wallBody.setCollisionGroup(UIUtils.wallCollisionGroup);
            wallBody.collides([UIUtils.fragmentCollisionGroup, UIUtils.puffCollisionGroup, UIUtils.rayCollisionGroup]);
            this.game.physics.p2.addBody(wallBody);
        }
    },

    _updateTheme: function(theme) {
        this.weaponSymbolGroup.callAll('setTheme', null, theme);
        this.crateGroup.callAll('setTheme', null, theme);
    },

    _spawnRoundTitle: function(name, ranked) {
        this.roundTitleShown = true;
        var subtitle = "";
        if (ranked) {
            subtitle = "Ranked";
        } else if (this.gameController.getMode() == Constants.GAME_MODES.BOOT_CAMP) {
            subtitle = "No achievements";
        }
        this.roundTitleGroup.spawn(name, subtitle);
    },

    _spawnCountDown: function(value) {
        var countDownSprite = this.countDownGroup.getFirstExists(false);
        if (countDownSprite) {
            countDownSprite.spawn(value);
        } else {
            this.log.error("Could not create count down sprite. No sprite available.");
        }
    },

    _createTank: function(tank, playSpawnAnimation, smoothing) {
        var tankSprite = this.tankGroup.getFirstExists(false);
        if (tankSprite) {
            this.tankSprites[tank.getPlayerId()] = tankSprite;
            tankSprite.spawn(UIUtils.mpx(tank.getX()), UIUtils.mpx(tank.getY()), tank.getRotation(), tank.getPlayerId(), playSpawnAnimation, smoothing);

            var tankNameSprite = this.tankNameGroup.getFirstExists(false);
            if (tankNameSprite) {
                tankNameSprite.spawn(tank.getPlayerId());
            } else {
                this.log.error("Could not create tank name sprite. No sprite available.");
            }
        } else {
            this.log.error("Could not create tank sprite. No sprite available.");
        }
    },

    _removeTank: function(playerId) {
        if (this.tankSprites[playerId]) {
            this.tankSprites[playerId].remove();
            delete this.tankSprites[playerId];

            // Remove all tank-dependent stuff.
            this._removeUpgrades(playerId);
            this._removeCounters(playerId);
            this._removeWeaponSymbol(playerId);
            this._removeChatSymbol(playerId);

            return true;
        }

        return false;
    },

    _spawnTankExplosion: function(playerId) {
        var explosion = this.explosionGroup.getFirstExists(false);
        var tank = this.gameController.getTank(playerId);
        if (tank && explosion) {
            var x = UIUtils.mpx(tank.getX());
            var y = UIUtils.mpx(tank.getY());

            explosion.spawn(x, y, playerId);
        } else {
            this.log.error("Could not create explosion group. No tank or group available.");
        }
    },

    _spawnTankFeathers: function(playerId, tankPosition) {
        var tank = this.gameController.getTank(playerId);
        if (tank) {
            this.chickenOutSound.play();
            for (var i = 0; i < UIConstants.TANK_FEATHER_COUNT; ++i) {
                var feather = this.tankFeatherGroup.getFirstExists(false);
                if (feather) {
                    var x = UIUtils.mpx(tank.getX());
                    var y = UIUtils.mpx(tank.getY());

                    feather.spawn(x, y);
                } else {
                    this.log.error("Could not create tank feather. No sprite available.");
                }
            }

            var stake = this.gameController.getStake(playerId);
            if (stake) {
                GameManager.showRankChange(-stake.value, tankPosition);
            }


        } else {
            this.log.error("Could not create tank feather. No tank available.");
        }
    },

    _addCameraShake: function(shake) {
        if (QualityManager.getQuality() !== QualityManager.QUALITY_SETTINGS.MINIMUM) {
            this.cameraShake = Math.min(UIConstants.MAX_CAMERA_SHAKE, this.cameraShake + shake);
        }
    },

    _fireWeapon: function(playerId) {
        var tankSprite = this.tankSprites[playerId];
        if (tankSprite) {
            tankSprite.fire();
        }
    },

    _updateHomingMissileTarget: function(projectileId, playerId) {
        if (this.projectiles[projectileId]) {
            if (playerId !== null) {
                this.homingMissileTargetChangeSound.play();
            }
            this.projectiles[projectileId].updateTarget(playerId);
        }
    },

    _activateUpgrade: function(upgradeId) {
        if (this.upgrades[upgradeId]) {
            this.upgrades[upgradeId].activate();
        }
    },

    _weakenUpgrade: function(upgradeId) {
        if (this.upgrades[upgradeId]) {
            this.upgrades[upgradeId].weaken();
        }
    },

    _strengthenUpgrade: function(upgradeId) {
        if (this.upgrades[upgradeId]) {
            this.upgrades[upgradeId].strengthen();
        }
    },

    _destabilizeZone: function(zoneId) {
        if (this.zones[zoneId]) {
            this.zones[zoneId].destabilize();
        }
    },

    _createProjectile: function(projectile) {
        switch(projectile.getType()) {
            case Constants.WEAPON_TYPES.BULLET:
            {
                var projectileImage = this.projectileGroup.getFirstExists(false);
                if (!projectileImage) {
                    projectileImage = this.projectileGroup.add(new UIProjectileImage(this.game, this.gameController));
                }
                this.projectiles[projectile.getId()] = projectileImage;
                projectileImage.spawn(UIUtils.mpx(projectile.getX()), UIUtils.mpx(projectile.getY()), projectile.getId(), 'bullet');
                break;
            }
            case Constants.WEAPON_TYPES.LASER:
            {
                var laserGraphicsInstance = this.laserGroup.getFirstExists(false);
                if (!laserGraphicsInstance) {
                    laserGraphicsInstance = this.laserGroup.add(new UILaserGraphics(this.game, this.gameController));
                }
                this.projectiles[projectile.getId()] = laserGraphicsInstance;
                laserGraphicsInstance.spawn(UIUtils.mpx(projectile.getX()), UIUtils.mpx(projectile.getY()), projectile.getId(), projectile.getPlayerId());
                break;
            }
            case Constants.WEAPON_TYPES.DOUBLE_BARREL:
            {
                var projectileImage = this.projectileGroup.getFirstExists(false);
                if (!projectileImage) {
                    projectileImage = this.projectileGroup.add(new UIProjectileImage(this.game, this.gameController));
                }
                this.projectiles[projectile.getId()] = projectileImage;
                projectileImage.spawn(UIUtils.mpx(projectile.getX()), UIUtils.mpx(projectile.getY()), projectile.getId(), 'doubleBarrel');
                break;
            }
            case Constants.WEAPON_TYPES.SHOTGUN:
            {
                var projectileImage = this.projectileGroup.getFirstExists(false);
                if (!projectileImage) {
                    projectileImage = this.projectileGroup.add(new UIProjectileImage(this.game, this.gameController));
                }
                this.projectiles[projectile.getId()] = projectileImage;
                projectileImage.spawn(UIUtils.mpx(projectile.getX()), UIUtils.mpx(projectile.getY()), projectile.getId(), 'shotgun');
                break;
            }
            case Constants.WEAPON_TYPES.HOMING_MISSILE:
            {
                var homingMissileImage = this.missileGroup.getFirstExists(false);
                if (!homingMissileImage) {
                    homingMissileImage = this.missileGroup.add(new UIMissileImage(this.game, this.gameController, this.homingMissileTargetingSound));
                }
                this.projectiles[projectile.getId()] = homingMissileImage;
                homingMissileImage.spawn(UIUtils.mpx(projectile.getX()), UIUtils.mpx(projectile.getY()), projectile.getId(), projectile.getPlayerId(), 'homingMissile');
                break;
            }
        }
    },

    _bounceTankOnShield: function(tank, shieldedTank, collisionPoint, lookAtTankRotation) {
        if (tank.getSpeed() != 0.0 || (lookAtTankRotation && tank.getRotationSpeed() != 0.0) || shieldedTank.getSpeed() != 0.0) {
            this._spawnShieldSparks(shieldedTank, collisionPoint);
            this.shieldImpactSound.play();
        }
    },

    _bounceProjectileOnShield: function(projectile, shieldedTank, collisionPoint) {
        this._spawnShieldSparks(shieldedTank, collisionPoint);
        this.shieldImpactSound.play();

        switch(projectile.getType()) {
            case Constants.WEAPON_TYPES.LASER:
            {
                var laserGraphicsInstance = this.projectiles[projectile.getId()];
                if (laserGraphicsInstance) {
                    laserGraphicsInstance.addPoint(UIUtils.mpx(collisionPoint.x), UIUtils.mpx(collisionPoint.y));
                }
                break;
            }
        }
    },

    _bounceProjectileOnMaze: function(projectile, collisionPoint) {
        switch(projectile.getType()) {
            case Constants.WEAPON_TYPES.BULLET:
            case Constants.WEAPON_TYPES.DOUBLE_BARREL:
            case Constants.WEAPON_TYPES.SHOTGUN:
            case Constants.WEAPON_TYPES.HOMING_MISSILE:
            {
                if (Math.random() < 0.5)
                    this.bulletBounceSound.play();
                else
                    this.bulletBounce2Sound.play();
                break;
            }
            case Constants.WEAPON_TYPES.LASER:
            {
                var laserGraphicsInstance = this.projectiles[projectile.getId()];
                if (laserGraphicsInstance) {
                    laserGraphicsInstance.addPoint(UIUtils.mpx(collisionPoint.x), UIUtils.mpx(collisionPoint.y));
                }
                break;
            }
        }
    },

    _removeProjectile: function(projectileId) {
        if (this.projectiles[projectileId]) {
            this.projectiles[projectileId].remove();
            delete this.projectiles[projectileId];
        }
    },

    _spawnProjectilePuffs: function(projectileId) {
        var projectile = this.gameController.getProjectile(projectileId);
        if (projectile) {
            switch (projectile.getType()) {
                case Constants.WEAPON_TYPES.BULLET:
                case Constants.WEAPON_TYPES.DOUBLE_BARREL:
                case Constants.WEAPON_TYPES.HOMING_MISSILE:
                {
                    this.bulletPuffSound.play();
                    var numPuffs = QualityManager.getQualityValue(QualityManager.QUALITY_PARAMETERS.BULLET_PUFF_COUNT);
                    for (var i = 0; i < numPuffs; ++i) {
                        var puff = this.bulletPuffGroup.getFirstExists(false);
                        if (puff) {
                            var x = UIUtils.mpx(projectile.getX());
                            var y = UIUtils.mpx(projectile.getY());
                            var speedX = UIUtils.mpx(projectile.getSpeedX());
                            var speedY = UIUtils.mpx(projectile.getSpeedY());

                            puff.spawn(x, y, speedX, speedY);
                        } else {
                            this.log.error("Could not create bullet puff. No sprite available.");
                        }
                    }
                    break;
                }
                case Constants.WEAPON_TYPES.SHOTGUN:
                {
                    if (!this.bulletPuffSound.isPlaying) {
                        this.bulletPuffSound.play();
                    }
                    var puff = this.bulletPuffGroup.getFirstExists(false);
                    if (puff) {
                        var x = UIUtils.mpx(projectile.getX());
                        var y = UIUtils.mpx(projectile.getY());
                        var speedX = UIUtils.mpx(projectile.getSpeedX());
                        var speedY = UIUtils.mpx(projectile.getSpeedY());

                        puff.spawn(x, y, speedX, speedY);
                    } else {
                        this.log.error("Could not create bullet puff. No sprite available.");
                    }
                    break;
                }
            }
        } else {
            this.log.error("Could not create projectile puff. No projectile available.");
        }
    },

    _spawnShieldSparks: function(shieldedTank, position) {
        this.shieldSparkGroup.emit(shieldedTank, position);
    },

    _createCollectible: function(collectible, playSpawnAnimation) {
        switch(collectible.getType()) {
            case Constants.COLLECTIBLE_TYPES.CRATE_LASER:
            case Constants.COLLECTIBLE_TYPES.CRATE_DOUBLE_BARREL:
            case Constants.COLLECTIBLE_TYPES.CRATE_SHOTGUN:
            case Constants.COLLECTIBLE_TYPES.CRATE_HOMING_MISSILE:
            case Constants.COLLECTIBLE_TYPES.CRATE_AIMER:
            case Constants.COLLECTIBLE_TYPES.CRATE_SHIELD:
            case Constants.COLLECTIBLE_TYPES.CRATE_SPEED_BOOST:
            {
                var crateSprite = this.crateGroup.getFirstExists(false);
                if (crateSprite) {
                    this.collectibles[collectible.getId()] = crateSprite;
                    crateSprite.spawn(UIUtils.mpx(collectible.getX()), UIUtils.mpx(collectible.getY()), collectible.getRotation(), collectible.getType(), collectible.getId(), playSpawnAnimation);
                } else {
                    this.log.error("Could not create crate sprite. No sprite available.");
                }
                break;
            }
            case Constants.COLLECTIBLE_TYPES.GOLD:
            {
                var goldSprite = this.goldGroup.getFirstExists(false);
                if (goldSprite) {
                    this.collectibles[collectible.getId()] = goldSprite;
                    goldSprite.spawn(UIUtils.mpx(collectible.getX()), UIUtils.mpx(collectible.getY()), collectible.getId(), playSpawnAnimation);
                } else {
                    this.log.error("Could not create gold sprite. No sprite available");
                }
                break;
            }
            case Constants.COLLECTIBLE_TYPES.DIAMOND:
            {
                var diamondSprite = this.diamondGroup.getFirstExists(false);
                if (diamondSprite) {
                    this.collectibles[collectible.getId()] = diamondSprite;
                    diamondSprite.spawn(UIUtils.mpx(collectible.getX()), UIUtils.mpx(collectible.getY()), collectible.getRotation(), collectible.getId(), playSpawnAnimation);
                } else {
                    this.log.error("Could not create diamond sprite. No sprite available");
                }
                break;
            }

        }
    },

    _removeCollectible: function(collectibleId) {
        if (this.collectibles[collectibleId]) {
            this.collectibles[collectibleId].remove();
            delete this.collectibles[collectibleId];
        }
    },

    _startCollectibleAnimation: function(pickup) {
        var collectible = this.gameController.getCollectible(pickup.getCollectibleId());
        if (collectible) {
            switch (collectible.getType()) {
                case Constants.COLLECTIBLE_TYPES.GOLD:
                {
                    GameManager.sendGoldToTank(pickup, this._getCollectiblePositionAngleAndScale(pickup.getCollectibleId()));
                    break;
                }
                case Constants.COLLECTIBLE_TYPES.DIAMOND:
                {
                    GameManager.sendDiamondToTank(pickup, this._getCollectiblePositionAngleAndScale(pickup.getCollectibleId()));
                    break;
                }
            }
        } else {
            this.log.error("Could not start collectible animation. No collectible available.");
        }
    },

    _createWeapon: function(weapon, playSpawnAnimation) {
        var tankSprite = this.tankSprites[weapon.getPlayerId()];
        if (tankSprite) {
            tankSprite.addWeapon(weapon.getId(), playSpawnAnimation);
        }
    },

    _removeWeapon: function(playerId) {
        var tankSprite = this.tankSprites[playerId];
        if (tankSprite) {
            tankSprite.removeWeapon();
        }
    },

    _createUpgrade: function(upgrade, playSpawnAnimation) {
        switch(upgrade.getType()) {
            case Constants.UPGRADE_TYPES.LASER_AIMER:
            {
                var aimerGraphics = this.aimerGroup.getFirstExists(false);
                if (!aimerGraphics) {
                    aimerGraphics = this.aimerGroup.add(new UIAimerGraphics(this.game, this.gameController));
                }
                this.upgrades[upgrade.getId()] = aimerGraphics;
                aimerGraphics.spawn(upgrade.getPlayerId(), upgrade.getField("length"), upgrade.getField("activated"));
                break;
            }
            case Constants.UPGRADE_TYPES.SPAWN_SHIELD:
            case Constants.UPGRADE_TYPES.SHIELD:
            {
                var shieldSprite = this.shieldGroup.getFirstExists(false);
                if (!shieldSprite) {
                    shieldSprite = this.shieldGroup.add(new UIShieldSprite(this.game, this.gameController, this.shieldWeakenedSound));
                }
                this.upgrades[upgrade.getId()] = shieldSprite;
                shieldSprite.spawn(upgrade.getPlayerId(), upgrade.getField("weakened"), playSpawnAnimation);
                break;
            }
            case Constants.UPGRADE_TYPES.AIMER:
            {
                var aimerGraphics = this.aimerGroup.getFirstExists(false);
                if (!aimerGraphics) {
                    aimerGraphics = this.aimerGroup.add(new UIAimerGraphics(this.game, this.gameController));
                }
                this.upgrades[upgrade.getId()] = aimerGraphics;
                aimerGraphics.spawn(upgrade.getPlayerId(), upgrade.getField("length"), true);
                break;
            }
            case Constants.UPGRADE_TYPES.SPEED_BOOST:
            {
                // FIXME Show speed boost.
                break;
            }
        }
    },

    _removeUpgrade: function(upgradeId) {
        if (this.upgrades[upgradeId]) {
            this.upgrades[upgradeId].remove();
            delete this.upgrades[upgradeId];
        }
    },

    _removeUpgrades: function(playerId) {
        for (var upgradeId in this.upgrades) {
            if (this.upgrades[upgradeId].getPlayerId() == playerId) {
                this.upgrades[upgradeId].remove();
                delete this.upgrades[upgradeId];
            }
        }
    },

    _createCounter: function(counter, playSpawnAnimation) {
        switch(counter.getType()) {
            case Constants.COUNTER_TYPES.TIMER_COUNTDOWN:
            {
                var counterSprite = this.counterTimerGroup.getFirstExists(false);
                if (counterSprite) {
                    this.counters[counter.getId()] = counterSprite;
                    // FIXME Hack to place counter beneath overtime sprite. Make a proper system for handling this.
                    if (this.overtimeGroup.exists) {
                        counterSprite.spawn(0, UIConstants.TIMER_TOP_MARGIN + UIConstants.TIMER_FONT_SIZE + UIConstants.TIMER_SPACING, counter.getId(), playSpawnAnimation);
                    } else {
                        counterSprite.spawn(0, UIConstants.TIMER_TOP_MARGIN, counter.getId(), playSpawnAnimation);
                    }
                } else {
                    this.log.error("Could not create counter sprite. No sprite available.");
                }
                break;
            }
            case Constants.COUNTER_TYPES.OVERTIME_COUNT_UP:
            {
                this.counters[counter.getId()] = this.overtimeGroup;
                this.overtimeGroup.spawn(this.game.width / 2.0, UIConstants.TIMER_TOP_MARGIN, counter.getId(), playSpawnAnimation);
                break;
            }
        }
    },

    _removeCounter: function(counterId) {
        if (this.counters[counterId]) {
            this.counters[counterId].remove();
            delete this.counters[counterId];
        }
    },

    _removeCounters: function(playerId) {
        for (var counterId in this.counters) {
            if (this.counters[counterId].getPlayerId() == playerId) {
                this.counters[counterId].remove();
                delete this.counters[counterId];
            }
        }
    },

    _createZone: function(zone, playSpawnAnimation) {
        switch(zone.getType()) {
            case Constants.ZONE_TYPES.SPAWN:
            {
                var zoneSprite = this.spawnZoneGroup.getFirstExists(false);
                if (zoneSprite) {
                    this.zones[zone.getId()] = zoneSprite;
                    zoneSprite.spawn(zone.getId(), zone.getField("radius"), zone.getField("unstable"), playSpawnAnimation);
                } else {
                    this.log.error("Could not create zone sprite. No sprite available.");
                }
                break;
            }
        }
    },

    _removeZone: function(zoneId) {
        if (this.zones[zoneId]) {
            this.zones[zoneId].remove();
            delete this.zones[zoneId];
        }
    },

    _showWeaponSymbol: function(playerId) {
        // Check if symbol is present.
        if (playerId in this.weaponSymbolGroups) {
            this.weaponSymbolGroups[playerId].refresh();
        } else {
            var weaponSymbolSprite = this.weaponSymbolGroup.getFirstExists(false);
            if (weaponSymbolSprite) {
                this.weaponSymbolGroups[playerId] = weaponSymbolSprite;
                weaponSymbolSprite.spawn(playerId);
            } else {
                this.log.error("Could not create weapon symbol. No sprite available.");
            }
        }
    },

    _removeWeaponSymbol: function(playerId) {
        if (this.weaponSymbolGroups[playerId]) {
            this.weaponSymbolGroups[playerId].remove();
            delete this.weaponSymbolGroups[playerId];
        }
    },

    _showChatSymbol: function(playerIds) {
        // Check if symbol is present.
        for (var i = 0; i < playerIds.length; ++i) {
            var playerId = playerIds[i];
            if (playerId in this.chatSymbolSprites) {
                this.chatSymbolSprites[playerId].refresh();
            } else {
                var chatSymbolSprite = this.chatSymbolGroup.getFirstExists(false);
                if (chatSymbolSprite) {
                    this.chatSymbolSprites[playerId] = chatSymbolSprite;
                    chatSymbolSprite.spawn(playerId);
                } else {
                    this.log.error("Could not create chat symbol. No sprite available.");
                }
            }
        }
    },

    _hideChatSymbol: function(playerIds) {
        for (var i = 0; i < playerIds.length; ++i) {
            var playerId = playerIds[i];
            if (this.chatSymbolSprites[playerId]) {
                this.chatSymbolSprites[playerId].hide();
            }
        }
    },

    _removeChatSymbol: function(playerId) {
        if (this.chatSymbolSprites[playerId]) {
            this.chatSymbolSprites[playerId].remove();
            delete this.chatSymbolSprites[playerId];
        }
    },

    _spawnRubble: function(tank) {
        this.rubbleGroup.emit(tank);
    },

    _spawnCelebration: function(modeName, victoryAward) {
        this.celebrationTrophyGroup.spawn(this.game.width / 2.0, this.game.height / 2.0, modeName, victoryAward);
    },

    _clientEventHandler: function(self, evt, data) {
        self.log.debug("Client event: " + evt + ": " + data);
        switch(evt) {
            case TTClient.EVENTS.CHAT_ACTIVITY:
            {
                self._showChatSymbol(data);
                break;
            }
            case TTClient.EVENTS.GLOBAL_CHAT_POSTED:
            case TTClient.EVENTS.CHAT_POSTED:
            case TTClient.EVENTS.USER_CHAT_POSTED:
            {
                self._hideChatSymbol(data.getFrom());
                break;
            }
        }
    },

    // Local client only.
    _authenticationEventHandler: function(self, evt, data) {
        self.log.debug("Authentication event: " + evt + ": " + data);
        switch(evt) {
            case Users.EVENTS.GUEST_ADDED:
            case Users.EVENTS.PLAYER_AUTHENTICATED:
            {
                self.gameController.addPlayer(data);

                break;
            }
            case Users.EVENTS.GUESTS_ADDED:
            {
                for (var i = 0; i < data.length; ++i) {
                    self.gameController.addPlayer(data[i]);
                }

                break;
            }
            case Users.EVENTS.GUEST_REMOVED:
            case Users.EVENTS.PLAYER_DEAUTHENTICATED:
            {
                self.gameController.removePlayer(data);

                break;
            }
        }
    },

    _leaveState: function() {
        // Unregister game controller with GameManager.
        GameManager.setGameController(null);

        if (Users.getAllPlayerIds().length == 0) {
            this.state.start('Menu');
        } else {
            this.state.start('Lobby');
        }
    },

    _clientStateChangeHandler: function(self, oldState, newState, data, msg) {
        switch(newState) {
            case TTClient.STATES.UNCONNECTED:
            {
                self._leaveState();

                break;
            }
        }
    },

    _debugDrawB2DWorld: function(b2dWorld) {
        if (b2dWorld) {
            var body = b2dWorld.GetBodyList();
            this.debugGraphics.clear();
            this.debugGraphics.lineStyle(2, 0xff0000, 0.9);
            this.debugGraphics.beginFill(0x00ff00, 0.3);
            while(true)
            {
                if (body == null)
                    break;
                this._debugDrawB2DBody(body);
                body = body.GetNext();
            }
        }
    },

    _debugDrawB2DBody: function(b2dBody) {
        var fixture = b2dBody.GetFixtureList();
        while(true)
        {
            if (fixture == null)
                break;
            if (fixture.GetShape().GetVertices != undefined)
                this._debugDrawB2DPolygonFixture(b2dBody, fixture);
            else
                this._debugDrawB2DCircleFixture(b2dBody, fixture);
            fixture = fixture.GetNext();
        }
    },

    _debugDrawB2DPolygonFixture: function(b2dBody, b2dFixture) {
        var shape = b2dFixture.GetShape();
        var vertices = shape.GetVertices();
        var bodyTransform = b2dBody.GetTransform();
        var debugVertex = Box2D.Common.Math.b2Vec2.Make(0, 0);

        if (vertices.length > 0)
        {
            debugVertex.SetV(vertices[0]);
            debugVertex.MulM(bodyTransform.R);
            debugVertex.Add(bodyTransform.position);
            this.debugGraphics.moveTo(UIUtils.mpx(debugVertex.x), UIUtils.mpx(debugVertex.y));
        }
        for (var i = 1; i < vertices.length; ++i)
        {
            debugVertex.SetV(vertices[i]);
            debugVertex.MulM(bodyTransform.R);
            debugVertex.Add(bodyTransform.position);
            this.debugGraphics.lineTo(UIUtils.mpx(debugVertex.x), UIUtils.mpx(debugVertex.y));
        }
    },

    _debugDrawB2DCircleFixture: function(b2dBody, b2dFixture) {
        var shape = b2dFixture.GetShape();
        var bodyTransform = b2dBody.GetTransform();

        this.debugGraphics.drawCircle(UIUtils.mpx(bodyTransform.position.x), UIUtils.mpx(bodyTransform.position.y), 2.0 * UIUtils.mpx(shape.GetRadius()));
    },

    _debugDrawWorld: function(world) {
        this.debugGraphics.clear();
        this.debugGraphics.lineStyle(2, 0x0000ff, 0.5);
        this._debugDrawGroup(world);
    },

    _debugDrawGroup: function(group) {
        for (var i = 0; i < group.children.length; ++i) {
            var child = group.children[i];
            if (child.type == Phaser.GROUP || child.type == Phaser.EMITTER) {
                this._debugDrawGroup(child);
            } else if (child.type == Phaser.SPRITE || child.type == Phaser.IMAGE) {
                this._debugDrawSprite(child);
            }
        }
    },

    _debugDrawSprite: function(sprite) {
        var rect = sprite.getBounds();
        rect.topLeft = this.gameGroup.toLocal(rect.topLeft);
        if (sprite.exists) {
            this.debugGraphics.beginFill(0x00ff00, 0.1);
            this.debugGraphics.drawRect(rect.x, rect.y, rect.width / this.gameGroup.scale.x, rect.height / this.gameGroup.scale.y);
        } else {
            this.debugGraphics.beginFill(0xff0000, 0.1);
            this.debugGraphics.drawRect(rect.x, rect.y, rect.width / this.gameGroup.scale.x, rect.height / this.gameGroup.scale.y);
        }
    },

    _debugDrawMazeMap: function(map, minValue, maxValue, minColour, maxColour, alpha, clear) {
        clear = clear === undefined ? true : clear;
        if (clear) {
            this.debugGraphics.clear();
        }
        this.debugGraphics.lineStyle(0, 0x000000, 0);
        for (var i = 0; i < map.length; ++i) {
            for (var j = 0; j < map[i].length; ++j) {
                var rect = new Phaser.Rectangle(i * Constants.MAZE_TILE_SIZE.px, j * Constants.MAZE_TILE_SIZE.px, Constants.MAZE_TILE_SIZE.px, Constants.MAZE_TILE_SIZE.px);
                var value = map[i][j];
                var colour = Phaser.Color.interpolateColor(minColour, maxColour, maxValue - minValue, value - minValue);
                this.debugGraphics.beginFill(colour, alpha);
                this.debugGraphics.drawRect(rect.x, rect.y, rect.width, rect.height);
            }
        }
    },

    _debugDrawMazePath: function(path, width, startColour, endColour, clear) {
        clear = clear === undefined ? true : clear;
        if (clear) {
            this.debugGraphics.clear();
        }
        if (path.length > 0) {
            this.debugGraphics.moveTo((path[0].x + 0.5) * Constants.MAZE_TILE_SIZE.px, (path[0].y + 0.5) * Constants.MAZE_TILE_SIZE.px);
            for (var i = 1; i < path.length; ++i) {
                var colour = Phaser.Color.interpolateColor(startColour, endColour, path.length - 1, i);
                this.debugGraphics.lineStyle(width, colour, 0.8);
                this.debugGraphics.lineTo((path[i].x + 0.5) * Constants.MAZE_TILE_SIZE.px, (path[i].y + 0.5) * Constants.MAZE_TILE_SIZE.px);
            }
        }
    },

    _debugDrawPath: function(path, width, startColour, endColour, clear) {
        clear = clear === undefined ? true : clear;
        if (clear) {
            this.debugGraphics.clear();
        }
        if (path.length > 0) {
            this.debugGraphics.moveTo(UIUtils.mpx(path[0].x), UIUtils.mpx(path[0].y));
            for (var i = 1; i < path.length; ++i) {
                var colour = Phaser.Color.interpolateColor(startColour, endColour, path.length - 1, i);
                this.debugGraphics.lineStyle(width, colour, 0.8);
                this.debugGraphics.lineTo(UIUtils.mpx(path[i].x), UIUtils.mpx(path[i].y));
            }
        }
    },

    _debugDrawPoint: function(point, size, colour, clear) {
        clear = clear === undefined ? true : clear;
        if (clear) {
            this.debugGraphics.clear();
        }
        this.debugGraphics.lineStyle(0, 0x00000, 0.0);
        this.debugGraphics.beginFill(colour, 0.3);
        this.debugGraphics.drawCircle(UIUtils.mpx(point.x), UIUtils.mpx(point.y), size);
    }
});
