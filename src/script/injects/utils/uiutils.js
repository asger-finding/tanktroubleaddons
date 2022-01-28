var UIUtils = Classy.newClass();

UIUtils.classFields({
    wallCollisionGroup: null,
    tankCollisionGroup: null,
    fragmentCollisionGroup: null,
    crateCollisionGroup: null,
    puffCollisionGroup: null,
    rayCollisionGroup: null,
    shieldCollisionGroup: null,
    spawnCollisionGroup: null,
    
    wallMaterial: null,
    tankMaterial: null,
    fragmentMaterial: null,
    puffMaterial: null,
    
    wallPuffContactMaterial: null,
    wallFragmentContactMaterial: null,

    gameFloorCollisionGroup: null,
    gameFloorMaterial: null,

    trophyFragmentCollisionGroup: null,
    trophyFragmentMaterial: null,
    floorTrophyFragmentContactMaterial: null,

    playerPanelFloorCollisionGroup: null,
    playerPanelFloorMaterial: null,

    scoreFragmentCollisionGroup: null,
    scoreFragmentMaterial: null,
    floorScoreFragmentContactMaterial: null
});

UIUtils.classMethods({
    initUIGamePhysics: function(game) {
        game.physics.startSystem(Phaser.Physics.P2JS);
        
        // Disable bounds - effectively removing them from the world.
        game.physics.p2.setBoundsToWorld(false, false, false, false);
        
        this.wallCollisionGroup = game.physics.p2.createCollisionGroup();
        this.tankCollisionGroup = game.physics.p2.createCollisionGroup();
        this.fragmentCollisionGroup = game.physics.p2.createCollisionGroup();
        this.crateCollisionGroup = game.physics.p2.createCollisionGroup();
        this.puffCollisionGroup = game.physics.p2.createCollisionGroup();
        this.rayCollisionGroup = game.physics.p2.createCollisionGroup();
        this.shieldCollisionGroup = game.physics.p2.createCollisionGroup();
        this.spawnCollisionGroup = game.physics.p2.createCollisionGroup();

        this.wallMaterial = game.physics.p2.createMaterial("wall");
        this.tankMaterial = game.physics.p2.createMaterial("tank");
        this.fragmentMaterial = game.physics.p2.createMaterial("fragment");
        this.puffMaterial = game.physics.p2.createMaterial("puff");

        this.wallPuffContactMaterial = game.physics.p2.createContactMaterial(this.wallMaterial, this.puffMaterial);
        this.wallPuffContactMaterial.restitution = 0.0;
        this.wallPuffContactMaterial.friction = 1.0;
        this.wallPuffContactMaterial.relaxation = 10.0;

        this.wallFragmentContactMaterial = game.physics.p2.createContactMaterial(this.wallMaterial, this.fragmentMaterial);
        this.wallFragmentContactMaterial.restitution = 0.0;
        this.wallFragmentContactMaterial.friction = 0.0;

        this.gameFloorCollisionGroup = game.physics.p2.createCollisionGroup();
        this.gameFloorMaterial = game.physics.p2.createMaterial("floor");

        this.trophyFragmentCollisionGroup = game.physics.p2.createCollisionGroup();
        this.trophyFragmentMaterial = game.physics.p2.createMaterial("trophyfragment");

        this.floorTrophyFragmentContactMaterial = game.physics.p2.createContactMaterial(this.gameFloorMaterial, this.trophyFragmentMaterial);
        this.floorTrophyFragmentContactMaterial.restitution = 0.35;
        this.floorTrophyFragmentContactMaterial.friction = 1.0;
    },
    
    initUIPlayerPanelPhysics: function(game) {
        game.physics.startSystem(Phaser.Physics.P2JS);
        
        game.physics.p2.gravity.y = UIConstants.PLAYER_PANEL_GRAVITY;

        this.playerPanelFloorCollisionGroup = game.physics.p2.createCollisionGroup();
        this.playerPanelFloorMaterial = game.physics.p2.createMaterial("floor");

        this.scoreFragmentCollisionGroup = game.physics.p2.createCollisionGroup();
        this.scoreFragmentMaterial = game.physics.p2.createMaterial("scorefragment");

        this.floorScoreFragmentContactMaterial = game.physics.p2.createContactMaterial(this.playerPanelFloorMaterial, this.scoreFragmentMaterial);
        this.floorScoreFragmentContactMaterial.restitution = 0.35;
        this.floorScoreFragmentContactMaterial.friction = 1.0;

        var floorBody = new Phaser.Physics.P2.Body(game, null, 0.0, 0.0);
        floorBody.static = true;
        floorBody.addPlane(0.0, UIConstants.SCORE_EXPLOSION_Y, 0.0);
        floorBody.setMaterial(this.playerPanelFloorMaterial);
        floorBody.setCollisionGroup(this.playerPanelFloorCollisionGroup);
        floorBody.collides([this.scoreFragmentCollisionGroup]);
        
        game.physics.p2.addBody(floorBody)
    },

    addButton: function(buttonSprite, pressedFunction, releasedFunction, clickedFunction, context) {
        buttonSprite.events.onInputDown.add(function(sprite, pointer) {
            pressedFunction(context);

            // Prevent default action.
            if (window.event) {
                window.event.preventDefault();
                window.event.stopPropagation();
            }

            this.__inputDown = true;
        },
        buttonSprite);
        buttonSprite.events.onInputUp.add(function(sprite, pointer) {
            releasedFunction(context);

            if (this.__inputDown && this.input.checkPointerOver(pointer)) {
                clickedFunction(context);

                // Prevent default action.
                if (window.event) {
                    window.event.preventDefault();
                    window.event.stopPropagation();
                }
            }
            
            this.__inputDown = false;
        },
        buttonSprite);
    },
    
    computeButtonTextY: function(size, fontBaselineFraction) {
        // FIXME While technically correct, it looks better to not use the last bit in the following computation.
        return (UIConstants.BUTTON_SHADOW_HEIGHT_TOP - UIConstants.BUTTON_SHADOW_HEIGHT_BOTTOM) / 2.0;// + UIConstants.BUTTON_FONT_SIZES[size] * fontBaselineFraction * 0.5;
    },
    
    getLoadedAssetResolutionScale: function(devicePixelRatio) {
        if (devicePixelRatio > 1) {
            return 2;
        } else {
            return 1;
        }
    },
    
    easingCubicBezier: function(a, b, c, d) {
        var result = function(k) {
            return a * (1 - k) * (1 - k) * (1 - k) + b * 3 * k * (1 - k) * (1 - k) + c * 3 * k * k * (1 - k) + d * k * k * k;
        };
        return result;
    },

    easingSin: function(f, p) {
        var result = function(k) {
            return Math.sin((k + p) * f);
        };
        return result;
    },

    tweenTint: function(obj, startColor, endColor, time, easing, delay, onCompleteCB) {
        if (easing === undefined) {
            easing = Phaser.Easing.Default;
        }
        if (delay === undefined) {
            delay = 0;
        }

        // create a step object
        var colorBlend = {
            step: 0
        };

        // create a tween to increment that step from 0 to 100.
        var colorTween = obj.game.add.tween(colorBlend).to({ step: 100 }, time, easing, delay);

        // add an anonomous function with lexical scope to change the tint, calling Phaser.Colour.interpolateColor
        colorTween.onUpdateCallback(function() {
            obj.tint = Phaser.Color.interpolateColor(startColor, endColor, 100, colorBlend.step);
        });

        // set object to the starting colour
        obj.tint = startColor;

        // if you passed a callback, add it to the tween on complete
        if (onCompleteCB) {
            colorTween.onComplete.add(onCompleteCB, this);
        }

        // finally, start the tween
        colorTween.start();

        return colorTween;
    },

    getRankLevelFromRank: function(rank) {
        for (var i = 0; i < UIConstants.RANK_LEVELS.length; ++i) {
            if (rank < UIConstants.RANK_LEVELS[i]) {
                return i;
            }
        }

        return UIConstants.RANK_LEVELS.length;
    },

    getLevelFromXp: function(xp) {
        for (var i = 0; i < UIConstants.XP_LEVELS.length; ++i) {
            if (xp < UIConstants.XP_LEVELS[i]) {
                return i;
            }
        }

        return UIConstants.XP_LEVELS.length;
    },
    
    // Scale between physics (meters) and pixels.
    mpx: function(v) { return v * Constants.PIXELS_PER_METER;},
    pxm: function(v) { return v * Constants.METERS_PER_PIXEL;}
});
