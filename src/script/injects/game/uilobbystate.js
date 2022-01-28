var Game = Game || {};

Game.UILobbyState = Classy.newClass();

/*
 * Phaser fills in some properties:
 *  - game - a reference to the Phaser.Game
 *  - input - a reference to the Phaser.Input input manager
 *
*/

Game.UILobbyState.constructor(function() {
});

Game.UILobbyState.fields({
    gameIconPlaceholderGroup: null,
    gameIconGroup: null,
    gameButtonGroup: null,
    disconnectedIconGroup: null,
    gameIcons: {},
    gameIconPlacementsTaken: [],
    randomGameButton: null,
    randomGameInfo: null,
    createGameButton: null,
    createGameInfo: null,
    localGameButton: null,
    favouritePlayerIds: [],

    joiningGame: false,
    allGamesActive: false,
    allGamesFull: false,

    refreshGameListEvent: null,

    log: null
});

Game.UILobbyState.methods({
    preload: function() {

    },

    create: function() {
        // Create log.
        this.log = Log.create('UILobbyState');

        // Create game icon place holder group to hold all game icon place holders.
        this.gameIconPlaceholderGroup = this.game.add.group();

        // Add game icon placeholders.
        for (var i = 0; i < UIConstants.GAME_ICON_COUNT; ++i) {
            var x = (i / (UIConstants.GAME_ICON_COUNT - 1)) * (this.game.width - UIConstants.GAME_ICON_MARGIN - UIConstants.GAME_ICON_WIDTH) + UIConstants.GAME_ICON_WIDTH / 2.0 + UIConstants.GAME_ICON_MARGIN/2.0;

            var iconPlaceholder = this.gameIconPlaceholderGroup.add(this.game.make.sprite(x, UIConstants.GAME_ICON_Y, 'gameiconplaceholder'));
            iconPlaceholder.anchor.setTo(0.5, 0.5);
            iconPlaceholder.width = UIConstants.GAME_ICON_WIDTH;
            iconPlaceholder.height = UIConstants.GAME_ICON_HEIGHT;
            iconPlaceholder.alpha = 0.2;
        }

        // Create game icon group to hold all game icons.
        this.gameIconGroup = this.game.add.group();

        // Add pool of game icons
        for (var i = 0; i < UIConstants.GAME_ICON_POOL_SIZE; ++i) {
            this.gameIconGroup.add(new UIGameIconImage(this.game));
        }

        // Create disconnected icon.
        this.disconnectedIconGroup = this.game.add.existing(new UIDisconnectedIconGroup(this.game));

        // Create game button group to hold all game buttons.
        this.gameButtonGroup = this.game.add.group();

        // Add pool of game buttons
        for (var i = 0; i < UIConstants.GAME_ICON_POOL_SIZE; ++i) {
            this.gameButtonGroup.add(new UIGameButtonGroup(this.game, this._joinGame, this));
        }

        // Allocate placement array.
        this.gameIconPlacementsTaken = [];
        for (var i = 0; i < UIConstants.GAME_ICON_COUNT; ++i) {
            this.gameIconPlacementsTaken.push(false);
        }

        // Add join random game button.
        this.randomGameButton = this.game.add.existing(new UIButtonGroup(this.game, this.game.width / 3.0, this.game.height / 2.0, '', UIConstants.BUTTON_SIZES.LARGE, "Random", this._joinRandomGame, this));

        this.randomGameInfo = this.game.add.text(this.game.width / 3.0, this.game.height / 2.0 + UIConstants.RANDOM_GAME_BUTTON_INFO_Y, "", {font: UIConstants.BUTTON_INFO_FONT_SIZE+"px Arial", fill: "#999999"});
        this.randomGameInfo.anchor.setTo(0.5, 0.5);

        // FIXME Add check for if player has a premium account!
        // Add create game icon.
        this.createGameButton = this.game.add.existing(new UIButtonGroup(this.game, this.game.width / 3.0 * 2.0, this.game.height / 2.0, '', UIConstants.BUTTON_SIZES.LARGE, "New game", this._createNewGame, this));

        this.createGameInfo = this.game.add.text(this.game.width / 3.0 * 2.0, this.game.height / 2.0 + UIConstants.CREATE_GAME_BUTTON_INFO_Y, "", {font: UIConstants.BUTTON_INFO_FONT_SIZE+"px Arial", fill: "#999999"});
        this.createGameInfo.anchor.setTo(0.5, 0.5);

        // Add local game icon.
        this.localGameButton = this.game.add.existing(new UIButtonGroup(this.game, this.game.width / 2.0, this.game.height / 1.5, '', UIConstants.BUTTON_SIZES.LARGE, "Local game", this._createLocalGame, this));

        // Add event listeners.
        ClientManager.getClient().addEventListener(this._clientEventHandler, this);
        ClientManager.getClient().addErrorListener(this._clientErrorHandler, this);
        ClientManager.getClient().addStateChangeListener(this._clientStateChangeHandler, this);

        Users.addEventListener(this._authenticationEventHandler, this);

        this.scale.onSizeChange.add(this._onSizeChangeHandler, this);

        // Set correct offline/online UI.
        if (ClientManager.getClient().getState() !== TTClient.STATES.AUTHENTICATED) {
            this._goOfflineUI();
        } else {
            this._goOnlineUI();
            this._refreshGameList();
        }

        this.localGameButton.spawn();

        if (AdvertisementManager.shouldPresentAd()) {
            // Show ad overlay.
            OverlayManager.enqueueOverlay(
                TankTrouble.AdvertisementOverlay,
                {}
            );
        }

        // State.
        this.joiningGame = false;
    },

    shutdown: function() {
        // Retire UI.
        this._retireUI();

        // Remove event listeners.
        ClientManager.getClient().removeEventListener(this._clientEventHandler, this);
        ClientManager.getClient().removeErrorListener(this._clientErrorHandler, this);
        ClientManager.getClient().removeStateChangeListener(this._clientStateChangeHandler, this);

        Users.removeEventListener(this._authenticationEventHandler, this);

        // Remove tick for refreshing game lists.
        if (this.refreshGameListEvent) {
            this.game.time.events.remove(this.refreshGameListEvent);
            this.refreshGameListEvent = null;
        }

        // Remove resize handler.
        this.scale.onSizeChange.remove(this._onSizeChangeHandler, this);
    },

    _onSizeChangeHandler: function() {
        this.log.debug("SIZE CHANGE!");

        // FIXME: Handle when game cannot show more than 2 game icons.
        var iconCount = UIConstants.GAME_ICON_COUNT;
        if (this.game.width < UIConstants.GAME_ICON_WIDTH * 3 + UIConstants.GAME_ICON_MARGIN) {
            iconCount--;
        }
        if (this.game.width < UIConstants.GAME_ICON_WIDTH * 2 + UIConstants.GAME_ICON_MARGIN) {
            iconCount--;
        }

        // Move game icon placeholders and game icons.
        for (var i = 0; i < UIConstants.GAME_ICON_COUNT; ++i) {
            if (i < iconCount) {
                var x = (i / (iconCount - 1)) * (this.game.width - UIConstants.GAME_ICON_MARGIN - UIConstants.GAME_ICON_WIDTH) + UIConstants.GAME_ICON_WIDTH / 2.0 + UIConstants.GAME_ICON_MARGIN/2.0;

                this.gameIconPlaceholderGroup.getAt(i).x = x;
                this.gameIconPlaceholderGroup.getAt(i).visible = true;
            } else {
                this.gameIconPlaceholderGroup.getAt(i).visible = false;
            }

        }
        for (var gameIconSpriteId in this.gameIcons) {
            var placement = this.gameIcons[gameIconSpriteId].placement;
            if (placement < iconCount) {
                var x = (placement / (iconCount - 1)) * (this.game.width - UIConstants.GAME_ICON_MARGIN - UIConstants.GAME_ICON_WIDTH) + UIConstants.GAME_ICON_WIDTH / 2.0 + UIConstants.GAME_ICON_MARGIN/2.0;

                this.gameIcons[gameIconSpriteId].icon.x = x;
                this.gameIcons[gameIconSpriteId].button.x = x;
                this.gameIcons[gameIconSpriteId].icon.visible = true;
                this.gameIcons[gameIconSpriteId].button.visible = true;
            } else {
                this.gameIcons[gameIconSpriteId].icon.visible = false;
                this.gameIcons[gameIconSpriteId].button.visible = false;
            }
        }

        // Move offline message.
        this.disconnectedIconGroup.position.set(this.game.width / 2.0, UIConstants.DISCONNECTED_ICON_Y);

        // FIXME: Handle when game cannot show both buttons side by side. Either scale them down or place above each other. Also, handle y placement.

        // Move random and create game buttons.
        this.randomGameButton.x = this.game.width / 3.0;
        this.randomGameInfo.x = this.game.width / 3.0;
        this.createGameButton.x = this.game.width / 3.0 * 2.0;
        this.createGameInfo.x = this.game.width / 3.0 * 2.0;
        this.localGameButton.x = this.game.width / 2.0;

        // FIXME: Do the rest of the adaptive layout.
    },

    _joinGame: function(gameId) {
        this.joiningGame = true;

        this._updateGameButtons();

        // Start an online battle.
        Constants.setMode(Constants.MODE_CLIENT_ONLINE);
        ClientManager.getClient().joinGame(gameId);
    },

    _joinRandomGame: function() {
        this.joiningGame = true;

        this._updateGameButtons();

        // Start an online battle.
        Constants.setMode(Constants.MODE_CLIENT_ONLINE);
        ClientManager.getClient().quickjoinGame();
    },

    _createNewGame: function() {
        OverlayManager.pushOverlay(
            TankTrouble.NewGameOverlay,
            {}
        );
    },

    _createLocalGame: function() {
        this.joiningGame = true;

        this._updateGameButtons();

        // Start a local battle.
        Constants.setMode(Constants.MODE_CLIENT_LOCAL);

        var ttGame = GameController.create(BootCampGameMode.create(), Constants.MAZE_THEMES.RANDOM);

        var playerIds = Users.getAllPlayerIds();
        for (var i = 0; i < playerIds.length; ++i) {
            ttGame.addPlayer(playerIds[i]);
        }

        // Add an AI if only one local player.
        if (playerIds.length <= 1) {
            if (AIs.isReady()) {
                var aiId = AIs.getAvailableAIId(ttGame.getId());
                if (aiId) {
                    AIs.addAIManager(ttGame, aiId);
                    ttGame.addPlayer(aiId);
                }
            }
        }

        this.state.start('Game', true, false, ttGame);
    },

    createNewGame: function(ranked, gameMode) {
        // Start an online battle.
        Constants.setMode(Constants.MODE_CLIENT_ONLINE);

        this.joiningGame = true;

        this._updateGameButtons();

        ClientManager.getClient().createGame(ranked, gameMode); // FIXME Get settings from cookie?
    },

    _refreshGameList: function() {
        ClientManager.getClient().updateGameList();
    },

    update: function() {
        Inputs.update();
    },

    _removeUI: function() {
        this.disconnectedIconGroup.remove();
        // Clean up previous game icons.
        this.gameIconGroup.callAll('remove');
        this.gameButtonGroup.callAll('remove');
        this.gameIcons = {};
        this.randomGameButton.remove();
        this.randomGameInfo.setText("");
        this.createGameButton.remove();
        this.createGameInfo.setText("");
        this.localGameButton.remove();
        // FIXME: Finish removal.
    },

    _retireUI: function() {
        this.disconnectedIconGroup.retire();
        // Clean up previous game icons.
        this.gameIconGroup.callAll('retire');
        this.gameButtonGroup.callAll('retire');
        this.gameIcons = {};
        this.gameIconPlaceholderGroup.callAll('kill');
        this.randomGameButton.retire();
        this.randomGameInfo.setText("");
        this.createGameButton.retire();
        this.createGameInfo.setText("");
        this.localGameButton.retire();
        // FIXME: Finish retirement.
    },

    _goOfflineUI: function() {
        if (this.refreshGameListEvent) {
            // Remove tick for refreshing game lists every 10 seconds.
            this.game.time.events.remove(this.refreshGameListEvent);
            this.refreshGameListEvent = null;
        }

        this.disconnectedIconGroup.spawn(this.game.width / 2.0, UIConstants.DISCONNECTED_ICON_Y, UIConstants.DISCONNECTED_DELAY_TIME);
        // Clean up previous game icons.
        this.gameIconGroup.callAll('remove');
        this.gameButtonGroup.callAll('remove');
        this.gameIcons = {};
        this.randomGameButton.remove();
        this.randomGameInfo.setText("");
        this.createGameButton.remove();
        this.createGameInfo.setText("");
    },

    _goOnlineUI: function() {
        // Add tick for refreshing game lists every 10 seconds.
        this.refreshGameListEvent = this.game.time.events.loop(UIConstants.REFRESH_GAME_LIST_INTERVAL, this._refreshGameList, this);

        this.disconnectedIconGroup.remove();
        this.randomGameButton.spawn();
        this.createGameButton.spawn();
        this.gameIcons = {};
        for (var i = 0; i < UIConstants.GAME_ICON_COUNT; ++i) {
            this.gameIconPlacementsTaken[i] = false;
        }
    },

    _compareGameStates: function(gameStateA, gameStateB) {
        var statsA = this._countFavouritesActiveAndQueuedInGame(gameStateA);
        var statsB = this._countFavouritesActiveAndQueuedInGame(gameStateB);
        // First compare number of favourites.
        if (statsA[0] != statsB[0]) {
            return statsB[0] - statsA[0];
        }
        // Then compare number of active players.
        if (statsA[1] != statsB[1]) {
            // The number of active players are sorted in the following order: 3, 2, 1, 4. Always want a filled game to be sorted last.
            if (statsA[1] == Constants.GAME.MAX_ACTIVE_PLAYERS) {
                return 1;
            } else if (statsB[1] == Constants.GAME.MAX_ACTIVE_PLAYERS) {
                return -1;
            } else {
                return statsB[1] - statsA[1];
            }
        }
        // Then compare number of queued players.
        return statsA[2] - statsB[2];
    },

    _countFavouritesActiveAndQueuedInGame: function(gameState) {
        var favouritePlayerCount = 0;
        var activePlayerCount = 0;
        var queuedPlayerCount = 0;
        var playerStates = gameState.getPlayerStates();
        for (var i = 0; i < playerStates.length; i++) {
            var playerId = playerStates[i].getPlayerId();
            for (var j = 0; j < this.favouritePlayerIds.length; j++) {
                var favouritePlayerId = this.favouritePlayerIds[j];
                if (playerId==favouritePlayerId) {
                    ++favouritePlayerCount;
                }
            }
            var playerQueued = playerStates[i].getQueued();
            if (playerQueued) {
                ++queuedPlayerCount;
            } else {
                ++activePlayerCount;
            }
        }

        return [favouritePlayerCount, activePlayerCount, queuedPlayerCount];
    },

    _updateGameButtons: function() {
        if (this.allGamesActive) {
            this.createGameButton.disable();
            this.createGameInfo.setText("Server is full");
        } else if (this.joiningGame) {
            this.createGameButton.disable();
            this.createGameInfo.setText("");
        } else {
            this.createGameButton.enable();
            this.createGameInfo.setText("");
        }

        if (this.allGamesActive && this.allGamesFull) {
            this.randomGameButton.disable();
            this.randomGameInfo.setText("Server is full");
        } else if (this.joiningGame) {
            this.randomGameButton.disable();
            this.randomGameInfo.setText("");
        } else {
            this.randomGameButton.enable();
            this.randomGameInfo.setText("");
        }

        if (this.joiningGame) {
            this.localGameButton.disable();
        } else {
            this.localGameButton.enable();
        }

        for(var gameIconId in this.gameIcons) {
            if (this.joiningGame) {
                this.gameIcons[gameIconId].button.disable();
            } else {
                this.gameIcons[gameIconId].button.enable();
            }
        }
    },

    _clientEventHandler: function(self, evt, data) {
        self.log.debug("Client event: " + evt + ": " + data);
        switch(evt) {
            case TTClient.EVENTS.GAME_LIST_CHANGED:
            {
                var gameStates = ClientManager.getClient().getAvailableGameStates();
                var numGames = gameStates.length;

                self.allGamesActive = numGames === Constants.SERVER.MAX_GAME_COUNT;
                self.allGamesFull = true;
                for (var i = 0; i < numGames; ++i) {
                    if (gameStates[i].getPlayerStates().length < Constants.GAME.MAX_ACTIVE_PLAYERS + Constants.GAME.MAX_QUEUED_PLAYERS) {
                        self.allGamesFull = false;
                        break;
                    }
                }

                self._updateGameButtons();

                // Get all favourites.
                var playerIds = Users.getAllPlayerIds();
                var numFavouritesResponses = 0;
                var numExpectedFavouritesResponses = playerIds.length;
                self.favouritePlayerIds = [];

                for (var i = 0; i < playerIds.length; ++i) {
                    Backend.getInstance().getFavourites(
                        function(result) {
                            if (Array.isArray(result)) {
                                self.favouritePlayerIds = self.favouritePlayerIds.concat(result);
                            }
                        },
                        function(result) {

                        },
                        function(result) {
                            // Count that we got a response.
                            ++numFavouritesResponses;
                            // If we have them all, build up list of games we want to show.
                            if (numFavouritesResponses == numExpectedFavouritesResponses) {
                                var gameStates = ClientManager.getClient().getAvailableGameStates().sort(
                                    // Create anonymous function to get correct context.
                                    function(a, b) {
                                        return self._compareGameStates(a, b);
                                    }
                                );

                                // Remove icons that should no longer show.
                                for (var gameIconSpriteId in self.gameIcons) {
                                    var gameIconStillNeeded = false;
                                    for (var j = 0; j < Math.min(gameStates.length, UIConstants.GAME_ICON_COUNT); ++j) {
                                        if (gameIconSpriteId == gameStates[j].getId()) {
                                            gameIconStillNeeded = true;
                                            break;
                                        }
                                    }

                                    if (!gameIconStillNeeded) {
                                        self.gameIcons[gameIconSpriteId].icon.remove();
                                        self.gameIcons[gameIconSpriteId].button.remove();
                                        self.gameIconPlacementsTaken[self.gameIcons[gameIconSpriteId].placement] = false;
                                        delete self.gameIcons[gameIconSpriteId];
                                    }
                                }

                                /*var index = 0;
                                var widthPerGameIcon = UIConstants.TANK_PANEL_MAX_WIDTH / iconCount;

                                for (var j = 0; j < UIConstants.GAME_ICON_COUNT; ++j) {
                                    var x = (index + 0.5) * widthPerGameIcon;
                                    if (this.localUsernames[j] in this.localTankIcons) {
                                        //FIXME Update tank icon sprite position.
                                        this.localTankIcons[this.localUsernames[j]].icon.refresh(x);
                                        this.localTankIcons[this.localUsernames[j]].name.refresh(x);
                                    } else {
                                        var tankIconSprite = this.tankIconGroup.getFirstExists(false);
                                        var tankNameSprite = this.tankNameGroup.getFirstExists(false);
                                        if (tankIconSprite && tankNameSprite) {
                                            this.localTankIcons[this.localUsernames[j]] = {icon: tankIconSprite, name: tankNameSprite};

                                            tankIconSprite.spawn(x, (UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN) / 2.0, this.localUsernames[j], false);
                                            tankNameSprite.spawn(x, 0.0, this.localUsernames[j]); // FIXME Handle guests.
                                        } else {
                                            this.log.error("Could not create tank icon sprite or tank name sprite. No sprite available.");
                                        }
                                    }
                                    ++index;
                                }*/

                                // Update existing icons and show new ones.
                                for (var j = 0; j < Math.min(gameStates.length, UIConstants.GAME_ICON_COUNT); ++j) {

                                    if (gameStates[j].getId() in self.gameIcons) {
                                        //Update game icon sprite.
                                        var counts = self._countFavouritesActiveAndQueuedInGame(gameStates[j]);
                                        self.gameIcons[gameStates[j].getId()].icon.refresh(gameStates[j], counts);
                                        self.gameIcons[gameStates[j].getId()].button.refresh(counts);
                                    } else {
                                        var gameIconSprite = self.gameIconGroup.getFirstExists(false);
                                        var gameButton = self.gameButtonGroup.getFirstExists(false);
                                        if (gameIconSprite && gameButton) {
                                            // Compute the first available position.
                                            var availablePosition = 0;
                                            for (var k = 0; k < UIConstants.GAME_ICON_COUNT; ++k) {
                                                if (!self.gameIconPlacementsTaken[k]) {
                                                    availablePosition = k;
                                                    break;
                                                }
                                            }
                                            self.gameIconPlacementsTaken[availablePosition] = true;
                                            self.gameIcons[gameStates[j].getId()] = {icon: gameIconSprite, button: gameButton, placement: availablePosition};
                                            var x = (availablePosition / (UIConstants.GAME_ICON_COUNT - 1)) * (self.game.width - UIConstants.GAME_ICON_MARGIN - UIConstants.GAME_ICON_WIDTH) + UIConstants.GAME_ICON_WIDTH / 2.0 + UIConstants.GAME_ICON_MARGIN/2.0;
                                            var counts = self._countFavouritesActiveAndQueuedInGame(gameStates[j]);
                                            gameIconSprite.spawn(x, UIConstants.GAME_ICON_Y, gameStates[j], counts);
                                            gameButton.spawn(x, UIConstants.JOIN_GAME_BUTTON_Y, gameStates[j].getId(), counts, !self.joiningGame);
                                        } else {
                                            self.log.error("Could not create game icon sprite or game button. No sprite or button available.");
                                        }
                                    }
                                }
                            }
                        },
                        playerIds[i], Caches.getFavouritesCache()
                    );
                }
                break;
            }
            case TTClient.EVENTS.PLAYER_UPDATED:
            {
                // Iterate over all game icons in search of the tank icon and name to update.
                for (var gameIconSpriteId in self.gameIcons) {
                    var gameIcon = self.gameIcons[gameIconSpriteId].icon;
                    var tankIcons = gameIcon.getTankIcons();
                    for (var tankIconSpriteId in tankIcons) {
                        if (tankIconSpriteId == data.getPlayerId()) {
                            if (data.getIconChanged()) {
                                tankIcons[tankIconSpriteId].icon.updateIcon();
                            }
                            if (data.getUsernameChanged()) {
                                tankIcons[tankIconSpriteId].name.updateName();
                            }
                            break;
                        }
                    }
                }

                break;
            }
            case TTClient.EVENTS.GAME_JOINED:
            {
                // It is important to use TTClient.getPlayerIds here, as the array reference makes round controller work correctly.
                var playerIds = ClientManager.getClient().getPlayerIds();

                var ttGame = GameController.withIds(data, playerIds);

                self.state.start('Game', true, false, ttGame);

                break;
            }
        }
    },

    _clientErrorHandler: function(self, error, msg) {
        self.log.debug("Client error: " + error + ": " + msg);
        switch (error) {
            case TTClient.ERRORS.JOIN_GAME:
            case TTClient.ERRORS.CREATE_GAME:
            {
                self.joiningGame = false;

                self._updateGameButtons();

                break;
            }
        }
    },

    _clientStateChangeHandler: function(self, oldState, newState, data, msg) {
        self.log.debug("Client state: " + newState + ": " + msg);
        switch(newState) {
            case TTClient.STATES.UNCONNECTED:
            {
                self.joiningGame = false;

                self._updateGameButtons();

                // Update UI to offline mode.
                self._goOfflineUI();
                break;
            }
            case TTClient.STATES.AUTHENTICATED:
            {
                // Update UI to online mode.
                self._goOnlineUI();
                self._refreshGameList();
                break;
            }
        }
    },

    _authenticationEventHandler: function(self, evt, data) {
        self.log.debug("Authentication event: " + evt + ": " + data);

        if (Users.getAllPlayerIds().length == 0) {
            self.state.start('Menu');
        }
    }

});
