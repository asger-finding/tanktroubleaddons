var Garage = Garage || {};

Garage.UINoUsersState = Classy.newClass();

/*
 * Phaser fills in some properties:
 *  - game - a reference to the Phaser.Game
 *  - input - a reference to the Phaser.Input input manager
 *
*/

Garage.UINoUsersState.fields({
    messageText: null,
    backgroundSprite: null,

    log: null
});

Garage.UINoUsersState.methods({
    preload: function() {

    },

    create: function() {
        // Create log.
        this.log = Log.create('UINoUsersState');

        this.backgroundSprite = this.game.add.sprite(0, 0, 'background');
        this.backgroundSprite.anchor.setTo(0.5, 0.5);

        this.messageText = this.game.add.text(0, 0, "Log in to access your garage", {font: UIConstants.WAITING_MESSAGE_FONT_SIZE+"px Arial", fontWeight: "bold", fill: "#000000", stroke: "#ffffff", strokeThickness: UIConstants.WAITING_MESSAGE_STROKE_WIDTH});
        this.messageText.anchor.setTo(0.5, 0.5);

        this.scale.onSizeChange.add(this._onSizeChangeHandler, this);

        Users.addEventListener(this._authenticationEventHandler, this);

        // Handle scaling.
        this._onSizeChangeHandler();
    },

    shutdown: function() {
        this._retireUI();

        Users.removeEventListener(this._authenticationEventHandler, this);

        this.scale.onSizeChange.remove(this._onSizeChangeHandler, this);
    },

    _onSizeChangeHandler: function() {
        this.log.debug("SIZE CHANGE!");

        const unscaledBackgroundWidth = this.backgroundSprite.getLocalBounds().width;
        const unscaledBackgroundHeight = this.backgroundSprite.getLocalBounds().height;

        // Leave a small gap on the sides and top and bottom.
        // Do not scale up more than 0.8x.
        const backgroundScale = Math.min(0.8, Math.min((this.game.width - UIConstants.LOGIN_BACKGROUND_SIDE_MARGIN) / unscaledBackgroundWidth, (this.game.height - UIConstants.LOGIN_BACKGROUND_TOP_MARGIN - UIConstants.LOGIN_BACKGROUND_BOTTOM_MARGIN) / unscaledBackgroundHeight));
        const messageTextScale = Math.min(1.0, (this.game.width * 0.8) / this.messageText.width);
        this.backgroundSprite.scale.setTo(backgroundScale);
        this.messageText.scale.setTo(messageTextScale * UIConstants.ASSET_SCALE);

        this.backgroundSprite.position.set(this.game.width * 0.5, UIConstants.LOGIN_BACKGROUND_TOP_MARGIN + this.backgroundSprite.height * 0.5);

        this.messageText.x = this.game.width * 0.5;
        this.messageText.y = UIConstants.LOGIN_BACKGROUND_TOP_MARGIN + this.backgroundSprite.height * 0.5;
    },

    _authenticationEventHandler: function(self, evt, data) {
        self.log.debug("Authentication event: " + evt + ": " + data);
        switch(evt) {
            case Users.EVENTS.GUEST_ADDED:
            case Users.EVENTS.GUESTS_ADDED:
            case Users.EVENTS.PLAYER_AUTHENTICATED:
            {
                self.state.start('Load');

                break;
            }
        }
    },

    _retireUI: function() {

    },

    update: function() {
    }
});
