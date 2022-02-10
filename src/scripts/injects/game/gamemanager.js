var GameManager = Classy.newClass();

GameManager.classFields({
    goldPickupAudio: null,
    goldLandAudio: null,

    phaserInstance: null,
    gameController: null,

    // Events.
    gameEventListeners: [],
    roundEventListeners: []
});

GameManager.classMethods({
    addGameEventListener: function(callback, context) {
        GameManager.gameEventListeners.push({cb: callback, ctxt: context});
    },

    removeGameEventListener: function(callback, context) {
        for (let i = 0;i<GameManager.gameEventListeners.length;i++) {
            if (GameManager.gameEventListeners[i].cb===callback && GameManager.gameEventListeners[i].ctxt===context) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                GameManager.gameEventListeners.splice(i, 1);
                return;
            }
        }
    },

    addRoundEventListener: function(callback, context) {
        GameManager.roundEventListeners.push({cb: callback, ctxt: context});
    },

    removeRoundEventListener: function(callback, context) {
        for (let i = 0;i<GameManager.roundEventListeners.length;i++) {
            if (GameManager.roundEventListeners[i].cb===callback && GameManager.roundEventListeners[i].ctxt===context) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                GameManager.roundEventListeners.splice(i, 1);
                return;
            }
        }
    },

    init: function() {
        GameManager.goldPickupAudio = new Audio('assets/audio/GoldPickup.m4a');
        GameManager.goldLandAudio = new Audio('assets/audio/GoldLand.m4a');
    },

    initGame: function() {
        AudioManager.addEventListener(GameManager._audioEventHandler, this);
        ResizeManager.addEventListener(GameManager._resizeEventHandler, this);

        GameManager.insertGame($("#game"));
        UIPlayerPanel.insertPanel($("#playerPanel"));
    },
    
    deinitGame: function() {
        AudioManager.removeEventListener(GameManager._audioEventHandler, this);
        ResizeManager.addEventListener(GameManager._resizeEventHandler, this);

        GameManager.removeGame();
        UIPlayerPanel.removePanel();
    },
    
    insertGame: function(parentElement) {
        parentElement.empty();
        
        const config = {
            width: parentElement.width(),
            height: parentElement.height(),
            renderer: Phaser.WEBGL,
            //multiTexture: true,
            parent: parentElement[0],
            transparent: true,
            enableDebug: false    
        };
        GameManager.phaserInstance = new Phaser.Game(config);

        GameManager.phaserInstance.state.add('Boot', Game.UIBootState.create());
        GameManager.phaserInstance.state.add('Preload', Game.UIPreloadState.create());
        GameManager.phaserInstance.state.add('Menu', Game.UIMenuState.create());
        GameManager.phaserInstance.state.add('Lobby', Game.UILobbyState.create());
        GameManager.phaserInstance.state.add('Game', Game.UIGameState.create());

        GameManager.phaserInstance.state.start('Boot');

        return GameManager.phaserInstance;
    },
    
    removeGame: function() {
        if (GameManager.phaserInstance) {
            if (GameManager.phaserInstance.load) {
                GameManager.phaserInstance.load.reset(true, true);
            }
            GameManager.phaserInstance.destroy();
            GameManager.phaserInstance = null;
        }

        // Leave game if inside an online one.
        if (ClientManager.getClient().getCurrentGameId()) {
            ClientManager.getClient().leaveGame(true);
        }

        GameManager.setGameController(null);
    },

    getGame: function() {
        return GameManager.phaserInstance;
    },

    disableGameInput: function() {
        const game = GameManager.getGame();
        if (game && game.input) {
            game.input.enabled = false;
            game.input.reset();
        }
    },

    enableGameInput: function() {
        const game = GameManager.getGame();
        if (game && game.input) {
            game.input.enabled = true;
            game.input.reset();
        }
    },

    setGameController: function(gameController) {
        // Remove old event listener.
        if (GameManager.gameController) {
            GameManager.gameController.removeGameEventListener(GameManager._gameEventHandler, GameManager);
            GameManager.gameController.removeRoundEventListener(GameManager._roundEventHandler, GameManager);
        }

        GameManager.gameController = gameController;

        // Add new event listener.
        if (GameManager.gameController) {
            GameManager.gameController.addGameEventListener(GameManager._gameEventHandler, GameManager);
            GameManager.gameController.addRoundEventListener(GameManager._roundEventHandler, GameManager);
        }
    },

    getGameController: function() {
        return GameManager.gameController;
    },

    showRankChange: function(rankChange, position) {
        if (rankChange === 0) {
            return;
        }

        if (position) {
            const updateDiv = $("<div class='rankChange'></div>");
            updateDiv.svg({settings: {width: 80, height: 32}});
            const updateSvg = updateDiv.svg("get");

            let fillColor = '#ffda00';
            if (rankChange < 0) {
                fillColor = '#e00000';
            }

            updateSvg.text(40, 30, rankChange + "", {textAnchor: 'middle', fontFamily: 'Arial Black', fontWeight: 'normal', fontSize: 30, fill: 'none', stroke: 'black', strokeLineJoin: 'round', strokeWidth: 4});
            updateSvg.text(40, 30, rankChange + "", {textAnchor: 'middle', fontFamily: 'Arial Black', fontWeight: 'normal', fontSize: 30, fill: fillColor, strokeLineJoin: 'round'});

            updateDiv.css({left: position.x - 40,
                          top: position.y - 16,
                          scale : 0});

            $("body").append(updateDiv);

            updateDiv.animate({scale: 1}, {specialEasing: {scale: 'easeOutBack'}, duration: 300});
            updateDiv.animate({top: '-=25', opacity: 0}, {duration: 1000, complete: function() {
                $(this).remove();
            }});
        }
    },

    showXPChange: function(xpChange, position, delay) {
        if (xpChange === 0) {
            return;
        }

        if (position) {
            const updateDiv = $("<div class='rankChange'></div>");
            updateDiv.svg({settings: {width: 60, height: 32}});
            const updateSvg = updateDiv.svg("get");

            const fillColor = '#e600ff';

            updateSvg.text(30, 30, xpChange + "", {textAnchor: 'middle', fontFamily: 'Arial Black', fontWeight: 'normal', fontSize: 30, fill: 'none', stroke: 'black', strokeLineJoin: 'round', strokeWidth: 4});
            updateSvg.text(30, 30, xpChange + "", {textAnchor: 'middle', fontFamily: 'Arial Black', fontWeight: 'normal', fontSize: 30, fill: fillColor, strokeLineJoin: 'round'});

            updateDiv.css({left: position.x - 30,
                top: position.y - 16,
                scale : 0});

            $("body").append(updateDiv);

            updateDiv
                .delay(delay)
                .animate({scale: 1}, {specialEasing: {scale: 'easeOutBack'}, duration: 300})
                .animate({top: '-=25', opacity: 0}, {duration: 1000, complete: function() {
                    $(this).remove();
                }});
        }
    },

    createNewGame: function(ranked, gameMode) {
        const game = GameManager.getGame();
        if (game && game.state) {
            if (game.state.current == 'Lobby') {
                game.state.getCurrentState().createNewGame(ranked, gameMode);
            }
        }
    },

    // FIXME Move this and _spawnGoldSparkle to other class for reuse.
    sendVictoryGoldToTank: function(playerId, goldAmount, tankPosition) {
        if (goldAmount === 0) {
            return;
        }

        const targetPosition = UIPlayerPanel.getLocalTankIconPosition(playerId);

        if (tankPosition && targetPosition) {
            AudioManager.playSound(GameManager.goldPickupAudio);
        }

        for (let i = 0; i < goldAmount; ++i) {
            if (tankPosition && targetPosition) {
                const goldIcon = $("<div class='goldIcon'></div>");
                const goldImage = $("<img class='gold' src='" + g_url("assets/images/game/gold.png") + "' srcset='" + g_url("assets/images/game/gold@2x.png") + " 2x'>");

                goldIcon.data("done", false);

                goldIcon
                    .css({left: tankPosition.x - 18,
                        top: tankPosition.y - 18,
                        scale: 0});

                goldIcon.append(goldImage);
                $("body").append(goldIcon);

                let xOffset = 0;
                let yOffset = 0;

                // Offset gold slightly in a circle.
                if (goldAmount > 1) {
                    const angle = 2.0 * Math.PI / goldAmount * i;
                    xOffset = Math.cos(angle) * 40.0;
                    yOffset = Math.sin(angle) * 40.0;
                }

                goldIcon
                    .delay(300*i)
                    .transition({scale: 2, left: '+='+xOffset, top: '+='+yOffset}, 600)
                    .delay(300);

                this._spawnGoldSparkle(goldIcon);

                goldIcon
                    .animate({left: targetPosition.x - 18, top: targetPosition.y - 18, scale: 0.5}, {specialEasing: {top: 'easeInBack'}, duration: 800, complete: function() {
                        $(this).remove();
                        $(this).data("done", true);
                        AudioManager.playSound(GameManager.goldLandAudio);
                    }});
            }
        }
    },


    // FIXME Move this and _spawnGoldSparkle to other class for reuse.
    sendGoldToTank: function(pickup, positionAngleScale) {
        AudioManager.playSound(GameManager.goldPickupAudio);

        const targetPosition = UIPlayerPanel.getLocalTankIconPosition(pickup.getPlayerId());
        if (positionAngleScale && targetPosition) {

            const goldIcon = $("<div class='goldIcon'></div>");
            const goldImage = $("<img class='gold' src='" + g_url("assets/images/game/gold.png") + "' srcset='" + g_url("assets/images/game/gold@2x.png") + " 2x'>");

            goldIcon.data("done", false);

            goldIcon
                .css({left: positionAngleScale.x - 18,
                    top: positionAngleScale.y - 18,
                    rotate: positionAngleScale.angle+'deg',
                    scale: positionAngleScale.scale});

            goldIcon.append(goldImage);
            $("body").append(goldIcon);

            goldIcon
                .transition({scale: 2, rotate: '0deg'}, 600)
                .delay(300);

            this._spawnGoldSparkle(goldIcon);

            goldIcon
                .animate({left: targetPosition.x - 18, top: targetPosition.y - 18, scale: 0.5}, {specialEasing: {top: 'easeInBack'}, duration: 800, complete: function() {
                    $(this).remove();
                    $(this).data("done", true);
                    AudioManager.playSound(GameManager.goldLandAudio);
                }});
        }
    },

    _spawnGoldSparkle: function(goldElement) {
        if (goldElement.data("done")) {
            return;
        }

        // 17 is half the radius of an unscaled coin.
        const distance = 17 - Math.random() * 2;
        const angle = Math.random() * 2.0*Math.PI;

        const sparkleX = -20 + 18 + Math.cos(angle) * distance;
        const sparkleY = -20 + 18 + Math.sin(angle) * distance;

        const sparkle = $("<img class='sparkle' src='" + g_url("assets/images/game/sparkle.png") + "' srcset='" + g_url("assets/images/game/sparkle@2x.png") + " 2x'>");
        sparkle
            .css({left: sparkleX,
                top: sparkleY,
                rotate: Math.floor(Math.random()*180)+'deg',
                scale: 0});

        goldElement.append(sparkle);

        sparkle
            .transition({scale: 1, rotate: '+=90deg'}, {duration: UIConstants.SPARKLE_ANIMATION_TIME, easing: 'linear'})
            .transition({scale: 0, rotate: '+=90deg'}, {duration: UIConstants.SPARKLE_ANIMATION_TIME, easing: 'linear', complete: function() {
                $(this).remove();
            }});

        const self = this;
        setTimeout(function() {
            self._spawnGoldSparkle(goldElement)
        }, UIConstants.GOLD_SPARKLE_MIN_INTERVAL_TIME + Math.random() * (UIConstants.GOLD_SPARKLE_MAX_INTERVAL_TIME - UIConstants.GOLD_SPARKLE_MIN_INTERVAL_TIME));
    },

    // FIXME Move this to other class for reuse.
    sendDiamondToTank: function(pickup, positionAngleScale) {
        AudioManager.playSound(GameManager.goldPickupAudio);

        const targetPosition = UIPlayerPanel.getLocalTankIconPosition(pickup.getPlayerId());
        if (positionAngleScale && targetPosition) {

            const diamondIcon = $("<div class='diamondIcon'></div>");
            const diamondImage = $("<img class='diamond' src='" + g_url("assets/images/game/diamond.png") + "' srcset='" + g_url("assets/images/game/diamond@2x.png") + " 2x'>");
            const diamondGlowImage = $("<img class='glow' src='" + g_url("assets/images/game/diamondGlow.png") + "' srcset='" + g_url("assets/images/game/diamondGlow@2x.png") + " 2x'>");
            const diamondFirstRayImage = $("<img class='ray' src='" + g_url("assets/images/game/diamondRays.png") + "' srcset='" + g_url("assets/images/game/diamondRays@2x.png") + " 2x'>");
            const diamondSecondRayImage = $("<img class='ray' src='" + g_url("assets/images/game/diamondRays.png") + "' srcset='" + g_url("assets/images/game/diamondRays@2x.png") + " 2x'>");

            diamondIcon.data("done", false);

            diamondIcon
                .css({left: positionAngleScale.x - 12,
                    top: positionAngleScale.y - 20,
                    rotate: positionAngleScale.angle+'deg',
                    scale: positionAngleScale.scale});

            diamondGlowImage.css({scale: positionAngleScale.extraInfo.glowScale.x});

            diamondFirstRayImage.css({rotate: positionAngleScale.extraInfo.firstRayAngle+'deg', opacity: positionAngleScale.extraInfo.firstRayAlpha});
            diamondSecondRayImage.css({rotate: positionAngleScale.extraInfo.secondRayAngle+'deg', opacity: positionAngleScale.extraInfo.secondRayAlpha});

            diamondIcon.append(diamondGlowImage);
            diamondIcon.append(diamondFirstRayImage);
            diamondIcon.append(diamondSecondRayImage);
            diamondIcon.append(diamondImage);
            $("body").append(diamondIcon);

            // Time to rotate 1080 degrees (including conversion from radians to degrees, and from s to ms).
            const firstRayRotationTime = 1080 / (UIConstants.DIAMOND_FIRST_RAY_ROTATION_SPEED / Math.PI * 180) * 1000;
            const secondRayRotationTime = 1080 / (UIConstants.DIAMOND_SECOND_RAY_ROTATION_SPEED / Math.PI * 180) * 1000;

            diamondFirstRayImage.transition({rotate: '+=1080deg'}, firstRayRotationTime, 'linear');
            diamondSecondRayImage.transition({rotate: '+=1080deg'}, secondRayRotationTime, 'linear');

            diamondIcon
                .transition({scale: 2, rotate: '0deg'}, 600)
                .delay(300);

            this._spawnDiamondSparkle(diamondIcon);

            diamondIcon
                .animate({left: targetPosition.x - 10, top: targetPosition.y - 21, scale: 0.5}, {specialEasing: {top: 'easeInBack'}, duration: 800, complete: function() {
                    $(this).remove();
                    $(this).data("done", true);
                    AudioManager.playSound(GameManager.goldLandAudio);
                }});

        }
    },

    _spawnDiamondSparkle: function(diamondElement) {
        if (diamondElement.data("done")) {
            return;
        }

        // 19 is half the height of an unscaled diamond.
        const distance = 19 - 2 - Math.random() * 2;
        const angle = Math.random() * 2.0*Math.PI;

        // 20 is half the width of a sparkle.
        const sparkleX = -20 + 12 + Math.cos(angle) * distance * 0.5;
        const sparkleY = -20 + 20 + Math.sin(angle) * distance;

        const sparkle = $("<img class='sparkle' src='" + g_url("assets/images/game/sparkle.png") + "' srcset='" + g_url("assets/images/game/sparkle@2x.png") + " 2x'>");
        sparkle
            .css({left: sparkleX,
                top: sparkleY,
                rotate: Math.floor(Math.random()*180)+'deg',
                scale: 0});

        diamondElement.append(sparkle);

        sparkle
            .transition({scale: 1, rotate: '+=90deg'}, {duration: UIConstants.SPARKLE_ANIMATION_TIME, easing: 'linear'})
            .transition({scale: 0, rotate: '+=90deg'}, {duration: UIConstants.SPARKLE_ANIMATION_TIME, easing: 'linear', complete: function() {
                $(this).remove();
            }});

        const self = this;
        setTimeout(function() {
            self._spawnDiamondSparkle(diamondElement)
        }, UIConstants.DIAMOND_SPARKLE_MIN_INTERVAL_TIME + Math.random() * (UIConstants.DIAMOND_SPARKLE_MAX_INTERVAL_TIME - UIConstants.DIAMOND_SPARKLE_MIN_INTERVAL_TIME));
    },

    _audioEventHandler: function(self, evt, data) {
        switch(evt) {
            case AudioManager.EVENTS.SOUND_ON:
            {
                if (GameManager.phaserInstance) {
                    GameManager.phaserInstance.sound.mute = false;
                    GameManager.phaserInstance.sound.volume = AudioManager.getSoundVolume();
                }
                
                break;
            }
            case AudioManager.EVENTS.SOUND_OFF:
            {
                if (GameManager.phaserInstance) {
                    GameManager.phaserInstance.sound.mute = true;
                }
                
                break;
            }
            case AudioManager.EVENTS.MUSIC_ON:
            case AudioManager.EVENTS.MUSIC_OFF:
            {
                break;
            }
        }
    },
    
    _resizeEventHandler: function(self, evt, data) {
        switch(evt) {
            case ResizeManager.EVENTS.REFRESH:
            {
                if (GameManager.phaserInstance && GameManager.phaserInstance.scale) {
                    GameManager.phaserInstance.scale.refresh();
                }
                break;
            }
        }        
    },

    _gameEventHandler: function(self, id, evt, data) {
        // Forward to game event listeners.
        for (let i = 0; i < GameManager.gameEventListeners.length; ++i) {
            GameManager.gameEventListeners[i].cb(GameManager.gameEventListeners[i].ctxt, id, evt, data);
        }
    },

    _roundEventHandler: function(self, id, evt, data) {
        // Forward to round event listeners.
        for (let i = 0; i < GameManager.roundEventListeners.length; ++i) {
            GameManager.roundEventListeners[i].cb(GameManager.roundEventListeners[i].ctxt, id, evt, data);
        }
    }
});
