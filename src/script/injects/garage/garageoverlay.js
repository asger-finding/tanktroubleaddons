var TankTrouble = TankTrouble || {};

TankTrouble.GarageOverlay = {
    // jQuery objects.
    garageWrapper: null,
    garagePhaser: null,
    garageForm: null,
    garageSubmitInput: null,

    // State.
    initialized: false,
    showing: false,
    playerId: null,
    phaserInstance: null,

    // Events.
    eventListeners: [],
    EVENTS: {
        OPENED: "opened",
        CLOSED: "closed"
    },

    _initialize: function() {
        this.garageWrapper = $("<div class='garage centre'/>");
        this.garagePhaser = $("<div class='phaser'></div>");
        this.garageForm = $("<form></form>");
        this.garageSubmitInput = $("<button class='medium' type='submit' tabindex='-1'>Done</button>");

        Utils.addOverlayFormRow(this.garageForm, this.garageSubmitInput);

        this.garageWrapper.append(this.garagePhaser);
        this.garageWrapper.append(this.garageForm);

        this.garageForm.submit(function(event) {
            OverlayManager.popOverlay(true, false);
            return false;
        });

        this.initialized = true;
    },

    addEventListener: function(callback, context) {
        this.eventListeners.push({cb: callback, ctxt: context});
    },

    removeEventListener: function(callback, context) {
        for (var i=0;i<this.eventListeners.length;i++) {
            if (this.eventListeners[i].cb===callback && this.eventListeners[i].ctxt===context) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                this.eventListeners.splice(i, 1);
                return;
            }
        }
    },

    /** Expected params:
     * playerId
     */
    show: function(params) {
        if (!this.initialized) {
            this._initialize();
        }

        // Store playerId.
        this.playerId = params.playerId;

        this.garagePhaser.empty();

        if (this.phaserInstance == null) {
            var config = {
                width: this.garagePhaser.width(),
                height: $(window).height()*0.9,
                renderer: Phaser.WEBGL,
                //multiTexture: true,
                parent: this.garagePhaser[0],
                transparent: true,
                enableDebug: false
            };
            this.phaserInstance = new Phaser.Game(config);

            this.phaserInstance.state.add('Boot', Garage.UIBootState.create());
            this.phaserInstance.state.add('Preload', Garage.UIPreloadState.create());
            this.phaserInstance.state.add('Load', Garage.UILoadState.create(this.playerId));
            this.phaserInstance.state.add('Main', Garage.UIMainState.create(this.playerId));

            this.phaserInstance.state.start('Boot');
        }

        this.showing = true;

        this._notifyEventListeners(TankTrouble.GarageOverlay.EVENTS.OPENED, this.playerId);
    },

    hide: function() {
        if (!this.initialized) {
            this._initialize();
        }

        var self = this;

        setTimeout(function() {
            // Phaser CE is a bit iffy with PIXI defaultRenderer and deletes it on phaserInstance destroy, so we store it and re-add it after destruction.
            var { defaultRenderer } = PIXI;
            self.phaserInstance.destroy();
            self.phaserInstance = null;
            PIXI.defaultRenderer = defaultRenderer;
        }, 200);

        this.showing = false;

        this._notifyEventListeners(TankTrouble.GarageOverlay.EVENTS.CLOSED, this.playerId);
    },

    isShowing: function() {
        return this.showing;
    },

    getPlayerId: function() {
        return this.playerId;
    },

    getAccessoryPosition: function(type, number) {
        if (this.phaserInstance) {
            if (this.phaserInstance.state.current == 'Main') {
                return this.phaserInstance.state.getCurrentState().getAccessoryPosition(type, number);
            }
        }

        return undefined;
    },

    getContents: function() {
        if (!this.initialized) {
            this._initialize();
        }

        return this.garageWrapper;
    },

    shouldHide: function() {
        return true;
    },

    canBeCancelled: function() {
        return true;
    },

    _notifyEventListeners: function(evt, data) {
        for (var i = 0; i < this.eventListeners.length; i++) {
            this.eventListeners[i].cb(this.eventListeners[i].ctxt, evt, data);
        }
    }
};
