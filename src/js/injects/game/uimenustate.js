var Game = Game || {};

Game.UIMenuState = Classy.newClass();

/*
 * Phaser fills in some properties:
 *  - game - a reference to the Phaser.Game
 *  - input - a reference to the Phaser.Input input manager
 *
*/

Game.UIMenuState.constructor(function() {
});

Game.UIMenuState.fields({
    backgroundGroup: null,

    onePlayerButton: null,
    twoPlayerButton: null,
    threePlayerButton: null,
    logInButton: null,
    buttonsScaledDown: false,

    addingGuests: false,

    log: null
});

Game.UIMenuState.methods({
    preload: function() {
    },

    create: function() {
        // Create log.
        this.log = Log.create('UIMenuState');

        this.backgroundGroup = this.game.add.existing(new UIMenuBackgroundGroup(this.game, 0, 0));

        this.onePlayerButton = this.game.add.existing(new UIButtonGroup(this.game, 0, 0, '', UIConstants.BUTTON_SIZES.LARGE, "1 player", this._onePlayer, this, UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.LARGE]));
        this.twoPlayerButton = this.game.add.existing(new UIButtonGroup(this.game, 0, 0, '', UIConstants.BUTTON_SIZES.LARGE, "2 players", this._twoPlayer, this, UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.LARGE]));
        this.threePlayerButton = this.game.add.existing(new UIButtonGroup(this.game, 0, 0, '', UIConstants.BUTTON_SIZES.LARGE, "3 players", this._threePlayer, this, UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.LARGE]));
        this.logInButton = this.game.add.existing(new UIButtonGroup(this.game, 0, 0, '', UIConstants.BUTTON_SIZES.MEDIUM, "Log in", this._logIn, this, UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.MEDIUM]));

        this.onePlayerButton.spawn();
        this.twoPlayerButton.spawn();
        this.threePlayerButton.spawn();
        this.logInButton.spawn();

        // Add event listeners.
        Users.addEventListener(this._authenticationEventHandler, this);

        this._updateLoginButton();

        this.scale.onSizeChange.add(this._onSizeChangeHandler, this);

        // Handle scaling.
        this._onSizeChangeHandler();

        UIPlayerPanel.disableInput();

        // State.
        this.addingGuests = false;
    },

    shutdown: function() {
        this._retireUI();

        UIPlayerPanel.showLoginIcon();
        UIPlayerPanel.enableInput();

        // Remove event listeners.
        Users.removeEventListener(this._authenticationEventHandler, this);

        // Remove resize handler.
        this.scale.onSizeChange.remove(this._onSizeChangeHandler, this);
    },

    _onSizeChangeHandler: function() {
        this.log.debug("SIZE CHANGE!");

        var unscaledBackgroundWidth = this.backgroundGroup.getLocalBounds().width;
        var unscaledBackgroundHeight = this.backgroundGroup.getLocalBounds().height;

        // Do not scale up more than 1x.
        var backgroundScale = Math.min(1.0, Math.min(this.game.width / unscaledBackgroundWidth, this.game.height * UIConstants.MENU_BACKGROUND_HEIGHT_RATIO / unscaledBackgroundHeight));
        this.backgroundGroup.scale.setTo(backgroundScale);

        var backgroundTopMargin = Math.max(UIConstants.MENU_BACKGROUND_MIN_TOP_MARGIN, this.game.height * UIConstants.MENU_BACKGROUND_Y_RATIO - this.backgroundGroup.height * 0.5);
        this.backgroundGroup.position.set(this.game.width * 0.5, backgroundTopMargin + this.backgroundGroup.height * 0.5);

        var buttonAnchorY = backgroundTopMargin + this.backgroundGroup.height * UIConstants.MENU_BUTTON_BACKGROUND_Y_RATIO;

        var scaleDown = false;
        scaleDown |= this.game.width < 3 * UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.LARGE] + 4 * UIConstants.MENU_BUTTON_SPACINGS[UIConstants.BUTTON_SIZES.LARGE];
        scaleDown |= this.game.height - buttonAnchorY < UIConstants.BUTTON_HEIGHTS[UIConstants.BUTTON_SIZES.LARGE] * 0.5 + UIConstants.BUTTON_HEIGHTS[UIConstants.BUTTON_SIZES.MEDIUM] * 0.5 + 2 * UIConstants.MENU_BUTTON_SPACINGS[UIConstants.BUTTON_SIZES.LARGE];

        if (scaleDown && !this.buttonsScaledDown) {
            this.buttonsScaledDown = true;
            this.onePlayerButton.setSize(UIConstants.BUTTON_SIZES.MEDIUM);
            this.twoPlayerButton.setSize(UIConstants.BUTTON_SIZES.MEDIUM);
            this.threePlayerButton.setSize(UIConstants.BUTTON_SIZES.MEDIUM);
            this.logInButton.setSize(UIConstants.BUTTON_SIZES.SMALL);
            this.onePlayerButton.setMinWidth(UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.MEDIUM]);
            this.twoPlayerButton.setMinWidth(UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.MEDIUM]);
            this.threePlayerButton.setMinWidth(UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.MEDIUM]);
            this.logInButton.setMinWidth(UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.SMALL]);
        } else if (!scaleDown && this.buttonsScaledDown) {
            this.buttonsScaledDown = false;
            this.onePlayerButton.setSize(UIConstants.BUTTON_SIZES.LARGE);
            this.twoPlayerButton.setSize(UIConstants.BUTTON_SIZES.LARGE);
            this.threePlayerButton.setSize(UIConstants.BUTTON_SIZES.LARGE);
            this.logInButton.setSize(UIConstants.BUTTON_SIZES.MEDIUM);
            this.onePlayerButton.setMinWidth(UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.LARGE]);
            this.twoPlayerButton.setMinWidth(UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.LARGE]);
            this.threePlayerButton.setMinWidth(UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.LARGE]);
            this.logInButton.setMinWidth(UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.MEDIUM]);
        }

        // Move buttons.
        var buttonSpacing = UIConstants.MENU_BUTTON_SPACINGS[UIConstants.BUTTON_SIZES.LARGE];
        var playerButtonWidth = UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.LARGE];
        var playerButtonHalfHeight = UIConstants.BUTTON_HEIGHTS[UIConstants.BUTTON_SIZES.LARGE] * 0.5;
        var secondaryButtonHalfHeight = UIConstants.BUTTON_HEIGHTS[UIConstants.BUTTON_SIZES.MEDIUM] * 0.5;
        if (this.buttonsScaledDown) {
            buttonSpacing = UIConstants.MENU_BUTTON_SPACINGS[UIConstants.BUTTON_SIZES.MEDIUM];
            playerButtonWidth = UIConstants.MENU_BUTTON_WIDTHS[UIConstants.BUTTON_SIZES.MEDIUM];
            playerButtonHalfHeight = UIConstants.BUTTON_HEIGHTS[UIConstants.BUTTON_SIZES.MEDIUM] * 0.5;
            secondaryButtonHalfHeight = UIConstants.BUTTON_HEIGHTS[UIConstants.BUTTON_SIZES.SMALL] * 0.5;
        }

        this.twoPlayerButton.position.set(this.game.width * 0.5, buttonAnchorY);
        this.onePlayerButton.position.set(this.game.width * 0.5 - playerButtonWidth - buttonSpacing, buttonAnchorY);
        this.threePlayerButton.position.set(this.game.width * 0.5 + playerButtonWidth + buttonSpacing, buttonAnchorY);

        this.logInButton.position.set(this.game.width * 0.5, buttonAnchorY + buttonSpacing + playerButtonHalfHeight + secondaryButtonHalfHeight);

    },

    _onePlayer: function() {
        this._addGuests(1);
    },

    _twoPlayer: function() {
        this._addGuests(2);
    },

    _threePlayer: function() {
        this._addGuests(3);
    },

    _logIn: function() {
        OverlayManager.pushOverlay(
            TankTrouble.LoginOverlay,
            {}
        );
    },

    _addGuests: function(totalNumberOfPlayers) {
        this.addingGuests = true;

        this._updatePlayerButtons();

        var self = this;
        Backend.getInstance().createGuests(
            function(result) {
                self.addingGuests = false;

                self._updatePlayerButtons();

                if (typeof(result) == "object") {
                    // Store player ids of guest users in an
                    // easily accessible place
                    Users.addGuestUsers(result.playerIds, result.multiplayerTokens);
                } else {
                    TankTrouble.ErrorBox.show(result);
                }
            },
            null,
            null,
            totalNumberOfPlayers,
            Caches.getPlayerDetailsCache()
        );
    },

    _authenticationEventHandler: function(self, evt, data) {
        if (Users.getAllPlayerIds().length > 0) {
            self.state.start('Lobby');
        }
    },

    _updatePlayerButtons: function() {
        if (this.addingGuests) {
            this.onePlayerButton.disable();
            this.twoPlayerButton.disable();
            this.threePlayerButton.disable();
            this.logInButton.disable();
        } else {
            this.onePlayerButton.enable();
            this.twoPlayerButton.enable();
            this.threePlayerButton.enable();
            this.logInButton.enable();
        }
    },

    _updateLoginButton: function() {
        var playerIds = Users.getAllPlayerIds();
        if (playerIds.length == 0) {
            UIPlayerPanel.hideLoginIcon();
        } else {
            UIPlayerPanel.showLoginIcon();
        }
    },

    _retireUI: function() {
        this.backgroundGroup.retire();
    },

    update: function() {
    }
});
