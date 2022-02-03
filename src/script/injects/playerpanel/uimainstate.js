const PlayerPanel = PlayerPanel || {};

PlayerPanel.UIMainState = Classy.newClass();

/*
 * Phaser fills in some properties:
 *  - game - a reference to the Phaser.Game
 *  - input - a reference to the Phaser.Input input manager
 *
*/

PlayerPanel.UIMainState.constructor(function() {
});

PlayerPanel.UIMainState.fields({
    tankAvatarPool: null,
    tankIconPool: null,
    tankIconGroup: null,
    tankNameGroup: null,
    tankScoreGroup: null,
    tankIconLoginSprite: null,

    localPlayerIdsToAdd: [],
    addingLocalPlayer: false,
    addingLocalPlayerDuration: 0,
    updateScheduled: false,
    showLoginIcon: false,
    loginIconWasHidden: false,

    inRankedGame: false,

    localTankIcons: {},
    loginTankIcon: null,
    onlineTankIcons: {},

    localPlayerIds: [],
    onlinePlayerIds: [],

    positionReliabilityDelay: 0,

    log: null
});

PlayerPanel.UIMainState.methods({
    preload: function() {

    },

    create: function() {
        // Create log.
        this.log = Log.create('UIMainState');

        // FIXME This should be done in shutdown in general!
        // FIXME This should be done in shutdown in general!
        // FIXME This should be done in shutdown in general!
        // FIXME This should be done in shutdown in general!
        // Clean old state.
        this.newlyAddedPlayerId = null;

        // Initialize physics system for UI elements
        UIUtils.initUIPlayerPanelPhysics(this.game);

        // Create tank icon group to hold all tank icons.
        this.tankIconGroup = this.game.add.group();

        // Add login tank icon.
        this.tankIconLoginSprite = this.tankIconGroup.add(new UITankIconLoginImage(this.game, UIConstants.TANK_ICON_SIZES.MEDIUM));

        // Add pool of tank icons - use custom pool to be able to put icons and avatars in same group for correct layering.
        this.tankIconPool = UIPool.create();
        for (let i = 0; i < UIConstants.TANK_ICON_POOL_SIZE; ++i) {
            const tankIcon = new UITankIconImage(this.game, true, UIConstants.TANK_ICON_SIZES.MEDIUM)
            this.tankIconPool.add(tankIcon);
            this.tankIconGroup.add(tankIcon);
        }

        // Add pool of tank avatars - use custom pool to be able to put icons and avatars in same group for correct layering.
        this.tankAvatarPool = UIPool.create();
        for (let i = 0; i < UIConstants.TANK_AVATAR_POOL_SIZE; ++i) {
            const tankAvatar = new UITankAvatarGroup(this.game);
            this.tankAvatarPool.add(tankAvatar);
            this.tankIconGroup.add(tankAvatar);
        }

        // Create tank name group to hold all tank names.
        this.tankNameGroup = this.game.add.group();

        // Add pool of tank names
        for (let i = 0; i < UIConstants.TANK_ICON_POOL_SIZE; ++i) {
            this.tankNameGroup.add(new UITankIconNameGroup(this.game, UIConstants.TANK_ICON_WIDTH_MEDIUM));
        }

        // Add event listeners.
        ClientManager.getClient().addEventListener(this._clientEventHandler, this);
        ClientManager.getClient().addStateChangeListener(this._clientStateChangeHandler, this);

        GameManager.addGameEventListener(this._gameEventHandler, this);
        Users.addEventListener(this._authenticationEventHandler, this);

        // Create tank score group to hold all tank scores.
        // FIXME This is done AFTER adding the event listeners as we want the response in the tank icon score sprite AFTER the icons have been updated.
        // FIXME Instead, we should introduce priority to the event listeners.
        this.tankScoreGroup = this.game.add.group();

        // Add pool of tank scores
        for (let i = 0; i < UIConstants.TANK_ICON_POOL_SIZE; ++i) {
            this.tankScoreGroup.add(new UITankIconScoreGroup(this.game));
        }

        this.scale.onSizeChange.add(this._onSizeChangeHandler, this);

        // Initialize state.
        this.updateScheduled = false;
        this.showLoginIcon = false;
        this.loginIconWasHidden = false;

        // Retrieve all local player ids including guests.
        this.localPlayerIds = Users.getAllPlayerIds();

        // Schedule initial update. If tab is game and no players are present, do not show login icon.
        this.scheduleUpdate(Content.getActiveTab() != 'game' || this.localPlayerIds.length != 0);

        // Handle scaling.
        this._onSizeChangeHandler();

        // Tank icon positions calculated before the page has settled down are unreliable.
        this.positionReliabilityDelay = 500;
    },

    shutdown: function() {
        // Retire UI.
        this._retireUI();

        // Remove event listeners.
        ClientManager.getClient().removeEventListener(this._clientEventHandler, this);
        ClientManager.getClient().removeStateChangeListener(this._clientStateChangeHandler, this);

        GameManager.removeGameEventListener(this._gameEventHandler, this);
        Users.removeEventListener(this._authenticationEventHandler, this);

        // Remove resize handler.
        this.scale.onSizeChange.remove(this._onSizeChangeHandler, this);
    },

    _onSizeChangeHandler: function() {
        this.log.debug("SIZE CHANGE!");
        // FIXME: Handle when game cannot show more than 2 or 1 tank icon.

        const iconScale = Math.min(1.0, Math.min(this.game.width / UIConstants.TANK_PANEL_MAX_WIDTH, this.game.height / (UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN)));

        this.tankIconGroup.scale.setTo(iconScale * UIConstants.ASSET_SCALE);
        this.tankIconGroup.position.set((this.game.width - iconScale * UIConstants.TANK_PANEL_MAX_WIDTH) / 2.0, this.game.height - iconScale * UIConstants.TANK_PANEL_MAX_HEIGHT);
        this.tankNameGroup.scale.setTo(iconScale * UIConstants.ASSET_SCALE);
        this.tankNameGroup.position.set((this.game.width - iconScale * UIConstants.TANK_PANEL_MAX_WIDTH) / 2.0, this.game.height - iconScale * UIConstants.TANK_PANEL_NAME_BOTTOM_MARGIN);
        this.tankScoreGroup.scale.setTo(iconScale * UIConstants.ASSET_SCALE);
        this.tankScoreGroup.position.set((this.game.width - iconScale * UIConstants.TANK_PANEL_MAX_WIDTH) / 2.0, this.game.height - iconScale * UIConstants.TANK_PANEL_SCORE_BOTTOM_MARGIN);
    },

    update: function() {
        let uiNeedsUpdate = this.updateScheduled;
        this.updateScheduled = false;

        if (this.addingLocalPlayer) {
            this.addingLocalPlayerDuration += this.game.time.delta;
            if (this.addingLocalPlayerDuration > UIConstants.ELEMENT_MOVE_TIME) {
                this.addingLocalPlayerDuration = 0;
                this.addingLocalPlayer = false;
                uiNeedsUpdate = true;
            }
        }

        if (!this.addingLocalPlayer && this.localPlayerIdsToAdd.length > 0) {
            this.addingLocalPlayer = true;
            this.addingLocalPlayerDuration = 0;

            // Add user to local player ids.
            this.localPlayerIds.push(this.localPlayerIdsToAdd.shift());

            uiNeedsUpdate = true;
        }

        if (uiNeedsUpdate) {
            this._updateUI();
            this.loginIconWasHidden = false;
        }

        this.tankIconGroup.sort('y', Phaser.Group.SORT_ASCENDING);

        if (this.positionReliabilityDelay > 0) {
            this.positionReliabilityDelay -= this.game.time.delta;
        }

        // Refresh game scale to update bounding box information if the playerpanel was moved.
        this.game.scale.refresh();
    },

    scheduleUpdate: function(showLoginIcon, loginIconWasHidden) {
        this.updateScheduled = true;
        if (showLoginIcon !== undefined) {
            this.showLoginIcon = showLoginIcon;
        }
        if (loginIconWasHidden !== undefined) {
            this.loginIconWasHidden = loginIconWasHidden;
        }
    },

    getLocalTankIconPosition: function(playerId) {
        if (this.positionReliabilityDelay > 0) {
            return undefined;
        }

        for (let i = 0; i < this.localPlayerIds.length; ++i) {
            if (playerId == this.localPlayerIds[i]) {
                if (playerId in this.localTankIcons) {
                    const icon = this.localTankIcons[playerId].icon;

                    const gameBounds = this.game.scale.bounds;
                    const position = icon.toGlobal(new Phaser.Point(0, 0));

                    // Scale from game canvas position to pixel position.
                    Phaser.Point.divide(position, this.game.scale.scaleFactor, position);

                    return {x: gameBounds.x + position.x, y: gameBounds.y + position.y};
                }

                return undefined;
            }
        }

        return undefined;
    },

    getOnlineTankIconPosition: function(playerId) {
        if (this.positionReliabilityDelay > 0) {
            return undefined;
        }

        for (let i = 0; i < this.onlinePlayerIds.length; ++i) {
            if (playerId == this.onlinePlayerIds[i]) {
                if (playerId in this.onlineTankIcons) {
                    const icon = this.onlineTankIcons[playerId].icon;

                    const gameBounds = this.game.scale.bounds;
                    const position = icon.toGlobal(new Phaser.Point(0, 0));

                    // Scale from game canvas position to pixel position.
                    Phaser.Point.divide(position, this.game.scale.scaleFactor, position);

                    return {x: gameBounds.x + position.x, y: gameBounds.y + position.y};
                }

                return undefined;
            }
        }

        return undefined;
    },

    showRankChanges: function(rankChanges) {
        for (let i = 0; i < rankChanges.length; ++i) {
            this._updateTankIcon(rankChanges[i].playerId, false, false, rankChanges[i].rank, rankChanges[i].change);
        }
    },

    _removeUI: function() {
        // Clean up previous tank icons.
        this.tankIconGroup.callAll('remove');
        this.tankNameGroup.callAll('remove');
        this.tankScoreGroup.callAll('remove');

        this.localTankIcons = {};
        this.loginTankIcon = null;
        this.onlineTankIcons = {};

        this.localPlayerIdsToAdd = [];
        // FIXME: Finish removal.
    },

    _retireUI: function() {
        // Clean up previous tank icons.
        this.tankIconGroup.callAll('retire');
        this.tankNameGroup.callAll('retire');
        this.tankScoreGroup.callAll('retire');

        this.localTankIcons = {};
        this.loginTankIcon = null;
        this.onlineTankIcons = {};

        this.localPlayerIdsToAdd = [];
        // FIXME: Finish retirement.
    },

    _updateUI: function() {
        // Remove local tank icons that should no longer show.
        for (const tankIconSpriteId in this.localTankIcons) {
            let tankIconStillNeeded = false;
            for (let i = 0; i < this.localPlayerIds.length; ++i) {
                if (tankIconSpriteId == this.localPlayerIds[i]) {
                    tankIconStillNeeded = true;
                    break;
                }
            }

            if (!tankIconStillNeeded) {
                this.localTankIcons[tankIconSpriteId].icon.remove();
                this.localTankIcons[tankIconSpriteId].name.remove();
                this.localTankIcons[tankIconSpriteId].score.remove();
                this.localTankIcons[tankIconSpriteId].avatar.remove();
                delete this.localTankIcons[tankIconSpriteId];
            }
        }

        // Remove online tank icons that should no longer show.
        for (const tankIconSpriteId in this.onlineTankIcons) {
            let tankIconStillNeeded = false;
            for (let i = 0; i < this.onlinePlayerIds.length; ++i) {
                if (tankIconSpriteId == this.onlinePlayerIds[i]) {
                    tankIconStillNeeded = true;
                    break;
                }
            }

            if (!tankIconStillNeeded) {
                this.onlineTankIcons[tankIconSpriteId].icon.remove();
                this.onlineTankIcons[tankIconSpriteId].name.remove();
                this.onlineTankIcons[tankIconSpriteId].score.remove();
                this.onlineTankIcons[tankIconSpriteId].avatar.remove();
                delete this.onlineTankIcons[tankIconSpriteId];
            }
        }

        // Remove login icon if it should no longer show.
        const showTankIconLogin = this.showLoginIcon && this.localPlayerIds.length < Constants.CLIENT.MAX_PLAYERS && (!this.addingLocalPlayer || this.onlinePlayerIds.length > 0);
        if (!showTankIconLogin) {
            if (this.loginTankIcon) {
                this.loginTankIcon.remove(this.onlinePlayerIds.length > 0 || !this.showLoginIcon);
                this.loginTankIcon = null;
            }
        }

        // Update existing icons and show new ones.
        let index = 0;
        const totalPlayerIds = this.localPlayerIds.length + this.onlinePlayerIds.length + (showTankIconLogin ? 1 : 0);
        const widthPerUser = (UIConstants.TANK_PANEL_MAX_WIDTH - UIConstants.TANK_PANEL_SIDE_MARGIN * 2) / totalPlayerIds;
        const scale = Math.min(1.0, widthPerUser / UIConstants.TANK_PANEL_MIN_WIDTH_PER_ICON);
        const interleaved = totalPlayerIds > UIConstants.TANK_PANEL_MAX_ICONS_BEFORE_INTERLEAVING;
        const scoreY = interleaved ? UIConstants.TANK_PANEL_INTERLEAVE_HEIGHT - UIConstants.TANK_PANEL_INTERLEAVE_OFFSET : 0;

        for (let i = 0; i < this.localPlayerIds.length; ++i) {

            const x = (index + 0.5) * widthPerUser + UIConstants.TANK_PANEL_SIDE_MARGIN;
            const y = interleaved ? (1 - index % 2) * UIConstants.TANK_PANEL_INTERLEAVE_HEIGHT - UIConstants.TANK_PANEL_INTERLEAVE_OFFSET : 0;
            const iconScale = interleaved ? scale * (index % 2 == 1 ? UIConstants.TANK_PANEL_ICON_INTERLEAVE_SCALE : 1.0) : 1.0;

            const animatePopIn = !((this.localPlayerIds[i] == this.newlyAddedPlayerId) && (this.onlinePlayerIds.length == 0)) || this.loginIconWasHidden;

            if (this.localPlayerIds[i] in this.localTankIcons) {
                // Update tank icon sprite position.
                this.localTankIcons[this.localPlayerIds[i]].avatar.refresh(x / UIConstants.ASSET_SCALE, ((UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN) / 2.0 + y) / UIConstants.ASSET_SCALE, iconScale);
                this.localTankIcons[this.localPlayerIds[i]].icon.refresh(x / UIConstants.ASSET_SCALE, ((UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN) / 2.0 + y) / UIConstants.ASSET_SCALE, iconScale);
                this.localTankIcons[this.localPlayerIds[i]].name.refresh(x / UIConstants.ASSET_SCALE, y / UIConstants.ASSET_SCALE, scale, this.inRankedGame);
                this.localTankIcons[this.localPlayerIds[i]].score.refresh(x / UIConstants.ASSET_SCALE, scoreY / UIConstants.ASSET_SCALE);
            } else {
                const tankAvatarSprite = this.tankAvatarPool.getFirstExists(false);
                const tankIconSprite = this.tankIconPool.getFirstExists(false);
                const tankNameSprite = this.tankNameGroup.getFirstExists(false);
                const tankScoreSprite = this.tankScoreGroup.getFirstExists(false);
                if (tankAvatarSprite && tankIconSprite && tankNameSprite && tankScoreSprite) {
                    this.localTankIcons[this.localPlayerIds[i]] = {avatar: tankAvatarSprite, icon: tankIconSprite, name: tankNameSprite, score: tankScoreSprite};

                    tankAvatarSprite.spawn(x / UIConstants.ASSET_SCALE, ((UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN) / 2.0 + y) / UIConstants.ASSET_SCALE, this.localPlayerIds[i], animatePopIn, iconScale);
                    tankIconSprite.spawn(x / UIConstants.ASSET_SCALE, ((UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN) / 2.0 + y) / UIConstants.ASSET_SCALE, this.localPlayerIds[i], false, animatePopIn, iconScale);
                    tankNameSprite.spawn(x / UIConstants.ASSET_SCALE, y / UIConstants.ASSET_SCALE, this.localPlayerIds[i], scale, this.inRankedGame);
                    tankScoreSprite.spawn(x / UIConstants.ASSET_SCALE, scoreY / UIConstants.ASSET_SCALE, this.localPlayerIds[i]);
                } else {
                    this.log.error("Could not create tank icon sprite, tank name sprite or tank score sprite. No sprite available.");
                }
            }
            ++index;
        }

        // Update existing icons and show new ones.
        for (let i = 0; i < this.onlinePlayerIds.length; ++i) {

            const x = (index + 0.5) * widthPerUser + UIConstants.TANK_PANEL_SIDE_MARGIN;
            const y = interleaved ? (1 - index % 2) * UIConstants.TANK_PANEL_INTERLEAVE_HEIGHT - UIConstants.TANK_PANEL_INTERLEAVE_OFFSET : 0;
            const iconScale = interleaved ? scale * (index % 2 == 1 ? UIConstants.TANK_PANEL_ICON_INTERLEAVE_SCALE : 1.0) : 1.0;

            if (this.onlinePlayerIds[i] in this.onlineTankIcons) {
                // Update tank icon sprite position.
                this.onlineTankIcons[this.onlinePlayerIds[i]].avatar.refresh(x / UIConstants.ASSET_SCALE, ((UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN) / 2.0 + y) / UIConstants.ASSET_SCALE, iconScale);
                this.onlineTankIcons[this.onlinePlayerIds[i]].icon.refresh(x / UIConstants.ASSET_SCALE, ((UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN) / 2.0 + y) / UIConstants.ASSET_SCALE, iconScale);
                this.onlineTankIcons[this.onlinePlayerIds[i]].name.refresh(x / UIConstants.ASSET_SCALE, y / UIConstants.ASSET_SCALE, scale, this.inRankedGame);
                this.onlineTankIcons[this.onlinePlayerIds[i]].score.refresh(x / UIConstants.ASSET_SCALE, scoreY / UIConstants.ASSET_SCALE);
            } else {
                const tankAvatarSprite = this.tankAvatarPool.getFirstExists(false);
                const tankIconSprite = this.tankIconPool.getFirstExists(false);
                const tankNameSprite = this.tankNameGroup.getFirstExists(false);
                const tankScoreSprite = this.tankScoreGroup.getFirstExists(false);
                if (tankAvatarSprite && tankIconSprite && tankNameSprite && tankScoreSprite) {
                    this.onlineTankIcons[this.onlinePlayerIds[i]] = {avatar: tankAvatarSprite, icon: tankIconSprite, name: tankNameSprite, score: tankScoreSprite};

                    tankAvatarSprite.spawn(x / UIConstants.ASSET_SCALE, ((UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN) / 2.0 + y) / UIConstants.ASSET_SCALE, this.onlinePlayerIds[i], true, iconScale);
                    tankIconSprite.spawn(x / UIConstants.ASSET_SCALE, ((UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN) / 2.0 + y) / UIConstants.ASSET_SCALE, this.onlinePlayerIds[i], false, true, iconScale);
                    tankNameSprite.spawn(x / UIConstants.ASSET_SCALE, y / UIConstants.ASSET_SCALE, this.onlinePlayerIds[i], scale, this.inRankedGame);
                    tankScoreSprite.spawn(x / UIConstants.ASSET_SCALE, scoreY / UIConstants.ASSET_SCALE, this.onlinePlayerIds[i]);
                } else {
                    this.log.error("Could not create tank icon sprite, tank name sprite or tank score sprite. No sprite available.");
                }
            }
            ++index;
        }

        // Update or show login icon.
        if (showTankIconLogin) {
            const x = (index + 0.5) * widthPerUser + UIConstants.TANK_PANEL_SIDE_MARGIN;
            const y = interleaved ? (1 - index % 2) * UIConstants.TANK_PANEL_INTERLEAVE_HEIGHT - UIConstants.TANK_PANEL_INTERLEAVE_OFFSET : 0;
            const iconScale = interleaved ? scale * (index % 2 == 1 ? UIConstants.TANK_PANEL_ICON_INTERLEAVE_SCALE : 1.0) : 1.0;

            if (this.loginTankIcon) {
                this.loginTankIcon.refresh(x / UIConstants.ASSET_SCALE, ((UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN) / 2.0 + y) / UIConstants.ASSET_SCALE, iconScale);
            } else {
                this.loginTankIcon = this.tankIconLoginSprite;
                this.tankIconLoginSprite.spawn(x / UIConstants.ASSET_SCALE, ((UIConstants.TANK_PANEL_MAX_HEIGHT - UIConstants.TANK_PANEL_ICON_BOTTOM_MARGIN) / 2.0 + y) / UIConstants.ASSET_SCALE, iconScale);
            }
            ++index;
        }

        // Clear newly added player id.
        this.newlyAddedPlayerId = null;
    },

    _updateTankIcon: function(playerId, iconChanged, usernameChanged, rank, rankChange) {
        if (rankChange === undefined) {
            rankChange = 0;
        }

        if (iconChanged) {
            for (const iconPlayerId in this.localTankIcons) {
                if (iconPlayerId == playerId) {
                    this.localTankIcons[iconPlayerId].icon.updateIcon();
                    break;
                }
            }
            for (const iconPlayerId in this.onlineTankIcons) {
                if (iconPlayerId == playerId) {
                    this.onlineTankIcons[iconPlayerId].icon.updateIcon();
                    break;
                }
            }
        }
        if (usernameChanged) {
            for (const iconPlayerId in this.localTankIcons) {
                if (iconPlayerId == playerId) {
                    this.localTankIcons[iconPlayerId].name.updateName();
                    break;
                }
            }
            for (const iconPlayerId in this.onlineTankIcons) {
                if (iconPlayerId == playerId) {
                    this.onlineTankIcons[iconPlayerId].name.updateName();
                    break;
                }
            }
        }
        if (rankChange) {
            for (const iconPlayerId in this.localTankIcons) {
                if (iconPlayerId == playerId) {
                    this.localTankIcons[iconPlayerId].name.updateRank(rank, rankChange);
                    break;
                }
            }
            for (const iconPlayerId in this.onlineTankIcons) {
                if (iconPlayerId == playerId) {
                    this.onlineTankIcons[iconPlayerId].name.updateRank(rank, rankChange);
                    break;
                }
            }
        }
    },

    _clientEventHandler: function(self, evt, data) {
        self.log.debug("Client event: " + evt + ": " + data);
        switch(evt) {
            case TTClient.EVENTS.PLAYER_UPDATED:
            {
                self._updateTankIcon(data.getPlayerId(), data.getIconChanged(), data.getUsernameChanged());

                break;
            }
        }
    },

    _gameEventHandler: function(self, id, evt, data) {
        self.log.debug("Game event: " + evt + ": " + data);
        switch(evt) {
            case GameModel._EVENTS.GAME_STATE_CHANGED: {
                // Store if in ranked game.
                self.inRankedGame = data.getRanked();

                const playerStates = data.getPlayerStates();
                // Overwrite online player ids.
                self.onlinePlayerIds = [];
                for (let i = 0; i < playerStates.length; ++i) {
                    if (self.localPlayerIds.indexOf(playerStates[i].getPlayerId()) == -1 &&
                        self.localPlayerIdsToAdd.indexOf(playerStates[i].getPlayerId()) == -1) {
                        self.onlinePlayerIds[self.onlinePlayerIds.length] = playerStates[i].getPlayerId();
                    }
                }

                self.scheduleUpdate();

                break;
            }
            case GameModel._EVENTS.GAME_ENDED: {
                self.inRankedGame = false;

                // Clear online player id state.
                self.onlinePlayerIds = [];

                self.scheduleUpdate();

                break;
            }
        }
    },

    _clientStateChangeHandler: function(self, oldState, newState, data, msg) {
        self.log.debug("Client state: " + newState + ": " + msg);
        switch(newState) {
            case TTClient.STATES.UNCONNECTED:
            {
                self.inRankedGame = false;

                // Clear online player id state.
                self.onlinePlayerIds = [];

                self.scheduleUpdate();

                break;
            }
        }
    },

    _authenticationEventHandler: function(self, evt, data) {
        self.log.debug("Authentication event: " + evt + ": " + data);
        switch(evt) {
            case Users.EVENTS.GUEST_ADDED:
            case Users.EVENTS.PLAYER_AUTHENTICATED:
            {
                if (!self.newlyAddedPlayerId) {
                    self.newlyAddedPlayerId = data;
                }

                self.localPlayerIdsToAdd.push(data);

                break;
            }
            case Users.EVENTS.GUESTS_ADDED:
            {
                if (!self.newlyAddedPlayerId) {
                    self.newlyAddedPlayerId = data[0];
                }

                for (let i = 0; i < data.length; ++i) {
                    self.localPlayerIdsToAdd.push(data[i]);
                }

                break;
            }
            case Users.EVENTS.GUEST_REMOVED:
            case Users.EVENTS.PLAYER_DEAUTHENTICATED:
            {
                // Remove user from local player ids not yet added.
                let userIndex = self.localPlayerIdsToAdd.indexOf(data);
                if (userIndex != -1) {
                    self.localPlayerIdsToAdd.splice(userIndex, 1);
                }

                // Remove user from local player ids.
                userIndex = self.localPlayerIds.indexOf(data);
                if (userIndex != -1) {
                    self.localPlayerIds.splice(userIndex, 1);
                }

                // Clear newly added player id.
                if (self.newlyAddedPlayerId == data) {
                    self.newlyAddedPlayerId = null;
                }

                self.scheduleUpdate();

                break;
            }
            case Users.EVENTS.GUEST_SIGNED_UP:
            {
                for (const iconPlayerId in self.localTankIcons) {
                    if (iconPlayerId == data) {
                        self.localTankIcons[iconPlayerId].name.updateName();
                        break;
                    }
                }
                for (const iconPlayerId in self.onlineTankIcons) {
                    if (iconPlayerId == data) {
                        self.onlineTankIcons[iconPlayerId].name.updateName();
                        break;
                    }
                }

                break;
            }
            case Users.EVENTS.PLAYER_UPDATED:
            {
                self._updateTankIcon(data.playerId, data.iconChanged, data.usernameChanged);

                break;
            }
        }
    }
});
