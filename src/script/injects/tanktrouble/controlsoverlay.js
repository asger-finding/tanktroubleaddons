var TankTrouble = TankTrouble || {};

TankTrouble.ControlsOverlay = {
    // jQuery objects.
    controlsWrapper: null,

    controlsHeadline: null,
    controlsUsername: null,
    controlsIcon: null,
    controlsMessage: null,
    controlsForm: null,
    controlsOptionsDiv: null,

    // Canvas element.
    iconCanvas: null,

    // State.
    initialized: false,
    showing: false,
    controlsOptions: {},
    playerId: null,
    count: null,
    animationInterval: null,
    hideTimeout: null,

    _initialize: function() {
        this.controlsWrapper = $("<div class='controls centre'/>");
        this.controlsHeadline = $("<div class='headline'>Welcome back</div>");
        this.controlsUsername = $("<div class='username huge'></div>");
        this.controlsContent = $("<div class='content'></div>");
        this.controlsIcon = $("<canvas style='width: 320px; height: 192px;'></canvas>");
        this.iconCanvas = this.controlsIcon[0];
        this.controlsMessage = $("<div class='headline'>Select your controls</div>");
        this.controlsForm = $("<form></form>");
        this.controlsOptionsDiv = $("<div class='options'></div>");

        var inputSetIds = Inputs.getAllInputSetIds();
        for (var i = 0; i < inputSetIds.length; ++i) {
            var controlsOptionDiv = $("<div class='option'></div>");

            Utils.addImageWithClasses(controlsOptionDiv, "standard", "assets/images/inputs/" + inputSetIds[i] + ".png");
            Utils.addImageWithClasses(controlsOptionDiv, "down", "assets/images/inputs/" + inputSetIds[i] + "Down.png");
            Utils.addImageWithClasses(controlsOptionDiv, "active", "assets/images/inputs/" + inputSetIds[i] + "Active.png");
            Utils.addImageWithClasses(controlsOptionDiv, "selected", "assets/images/inputs/" + inputSetIds[i] + "Selected.png");

            this.controlsOptions[inputSetIds[i]] = controlsOptionDiv;
            this.controlsOptionsDiv.append(controlsOptionDiv);
        }

        this.controlsForm.append(this.controlsMessage);
        this.controlsForm.append(this.controlsOptionsDiv);

        this.controlsWrapper.append(this.controlsHeadline);
        this.controlsWrapper.append(this.controlsUsername);
        this.controlsWrapper.append(this.controlsIcon);
        this.controlsWrapper.append(this.controlsForm);

        var self = this;

        // Add click event handlers to all control options.
        var controlOptionIds = Object.keys(this.controlsOptions);
        for (var i = 0; i < controlOptionIds.length; ++i) {
            // Solution with closure and anonymous function. More compact, but is it less readable?
/*            (function(controlOptionId) {
                self.controlsOptions[controlOptionId].on("click", function(event) {
                    if (!$(this).hasClass("disabled")) {
                        Inputs.updateInputManager(self.playerId, controlOptionId);
                        self._updateOptions();
                    }
                });
            })(controlOptionIds[i]);*/

            // Solution with helper function.
            this._addOptionClick(controlOptionIds[i]);
        }

        // Set the canvas size.
        this.iconCanvas.width = UIConstants.TANK_ICON_WIDTH_LARGE;
        this.iconCanvas.height = UIConstants.TANK_ICON_HEIGHT_LARGE;

        // Add event listeners.
        Users.addEventListener(this._authenticationEventHandler, this);

        this.initialized = true;
    },

    /** Expected params:
     *  playerId
     * count
     */
    show: function(params) {
        if (!this.initialized) {
            this._initialize();
        }

        // Store playerId.
        this.playerId = params.playerId;
        // Store count.
        if (params.count === undefined) {
            this.count = null;
        } else {
            this.count = params.count;
        }

        // Check if user has been signed out while someone else was choosing. Can happen when mp servers detect authentication problems.
        if (!Users.isAnyUser(this.playerId)) {
            OverlayManager.popOverlay(true, true);
            return;
        }

        this.showing = true;

        // Reset username. The linebreak is needed to prevent collapsing of the div.
        this.controlsUsername.html("<br>");

        // Update headline.
        this._updateHeadline();

        // Update options.
        this._updateOptions();

        // Add keyboard shortcuts.
        var controlOptionIds = Object.keys(this.controlsOptions);
        for (var i = 0; i < controlOptionIds.length; ++i) {
            this._addOptionShortcut(controlOptionIds[i]);
        }

        // Show icon.
        this.controlsIcon.hide();

        // Update icon.
        // FIXME Store last icon drawn and check if different before rendering again.
        UITankIcon.loadPlayerTankIcon(this.iconCanvas, UIConstants.TANK_ICON_SIZES.LARGE, this.playerId, function(self) {
                // Clear bitmap and show icon.
                self.iconCanvas.getContext("2d").clearRect(0, 0, self.iconCanvas.width, self.iconCanvas.height);
                self.controlsIcon.show();
            }, this);

        var self = this;

        // Animate options.
        this.animationInterval = setInterval(
            function() {
                self._animateOptions();
            },
            500
        );

        Backend.getInstance().getPlayerDetails(
            function(result) {
                if (typeof(result) == "object") {
                    self.controlsUsername.text(result.getUsername());
                } else {
                    self.controlsUsername.text("<ERROR>");
                }
            },
            function(result) {

            },
            function(result) {

            },
            this.playerId, Caches.getPlayerDetailsCache()
        );
    },

    hide: function() {
        if (!this.initialized) {
            this._initialize();
        }

        this.showing = false;

        // Stop options animation.
        clearInterval(this.animationInterval);
        this.animationInterval = null;
        // Stop hide timeout.
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;

        // Remove any shortcut event handlers.
        $(document).off("keyup.controls");
        $(document).off("keydown.controls");
    },

    getContents: function() {
        if (!this.initialized) {
            this._initialize();
        }

        return this.controlsWrapper;
    },

    shouldHide: function() {
        return true;
    },

    canBeCancelled: function() {
        return false;
    },

    _addOptionClick: function(controlOptionId) {
        var self = this;
        this.controlsOptions[controlOptionId].on("mouseup", function(event) {
            if (!$(this).hasClass("disabled")) {
                // Check if user has been signed out while choosing. Can happen when mp servers detect authentication problems.
                if (Users.isAnyUser(self.playerId)) {
                    Inputs.addInputManager(self.playerId, controlOptionId);
                    self._updateOptions();
                }

                clearTimeout(self.hideTimeout);
                self.hideTimeout = setTimeout(
                    function() {
                        OverlayManager.popOverlay(true, false);
                    }
                    , UIConstants.CONTROL_SELECTED_WAIT_TIME
                );
            }
        });
    },

    _addOptionShortcut: function(controlOptionId) {
        var self = this;
        // Add keyboard shortcut to keyboard type inputs.
        if (Inputs.getInputSetType(controlOptionId) == "keyboard") {
            var fireKey = Inputs.getFireKey(controlOptionId);
            $(document).on("keyup.controls", function(event) {
                if (!self.controlsOptions[controlOptionId].hasClass("disabled")) {
                    if (event.which == fireKey) {
                        self.controlsOptions[controlOptionId].removeClass("active");
                        // Check if user has been signed out while choosing. Can happen when mp servers detect authentication problems.
                        if (Users.isAnyUser(self.playerId)) {
                            Inputs.addInputManager(self.playerId, controlOptionId);
                            self._updateOptions();
                        }

                        clearTimeout(self.hideTimeout);
                        self.hideTimeout = setTimeout(
                            function() {
                                OverlayManager.popOverlay(true, false);
                            }
                            , UIConstants.CONTROL_SELECTED_WAIT_TIME
                        );

                        event.preventDefault();
                    }
                }
            });

            $(document).on("keydown.controls", function(event) {
                if (!self.controlsOptions[controlOptionId].hasClass("disabled")) {
                    if (event.which == fireKey) {
                        self.controlsOptions[controlOptionId].addClass("active");
                        event.preventDefault();
                    }
                }
            });
        }
    },

    _updateHeadline: function() {
        var headline = "";
        if (this.count !== null) {
            headline += "Player " + this.count + ":<br/>";
        }
        if (Users.isAuthenticatedUser(this.playerId)) {
            headline += "Welcome";
        } else {
            headline += "The scientists have named you";
        }
        this.controlsHeadline.html(headline);
    },

    _updateOptions: function() {
        // Reset classes.
        var controlOptionIds = Object.keys(this.controlsOptions);
        for (var i = 0; i < controlOptionIds.length; ++i) {
            this.controlsOptions[controlOptionIds[i]].removeClass("selected disabled");
        }

/*        // Reset tooltips
        for (var i = 0; i < this.controlsOptions.length; ++i) {

        }*/

        // Set currently assigned controls as selected.
        var selectedInputSetId = Inputs.getAssignedInputSetId(this.playerId);
        if (selectedInputSetId !== undefined) {
            this.controlsOptions[selectedInputSetId].addClass("selected");
        }

        // Disable unavailable controls.
        var unavailableInputSetIds = Inputs.getUnavailableInputSetIds();
        for (var i = 0; i < unavailableInputSetIds.length; ++i) {
            this.controlsOptions[unavailableInputSetIds[i]].addClass("disabled");
        }
    },

    _animateOptions: function() {
        var controlOptionIds = Object.keys(this.controlsOptions);
        for (var i = 0; i < controlOptionIds.length; ++i) {
            this.controlsOptions[controlOptionIds[i]].toggleClass("down");
        }
    },

    _authenticationEventHandler: function(self, evt, data) {
        switch(evt) {
            case Users.EVENTS.PLAYER_DEAUTHENTICATED:
            case Users.EVENTS.GUEST_REMOVED:
            {
                if (self.showing && data == self.playerId) {
                    OverlayManager.popOverlay(true, true);
                }

                break;
            }
        }
    },
};
