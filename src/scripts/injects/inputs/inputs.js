const Inputs = Classy.newClass();

Inputs.classFields({
    inputManagers: [],
    INPUT_TYPES: {
        KEYBOARD: "keyboard",
        MOUSE: "mouse",
        TOUCH: "touch"
    },
    _inputSets: {
        WASDKeys: {
            type: "keyboard",
            data: {
                forwardKey: Phaser.Keyboard.W,
                backKey: Phaser.Keyboard.S,
                leftKey: Phaser.Keyboard.A,
                rightKey: Phaser.Keyboard.D,
                fireKey: Phaser.Keyboard.Q
            }
        },
        arrowKeys: {
            type: "keyboard",
            data: {
                forwardKey: Phaser.Keyboard.UP,
                backKey: Phaser.Keyboard.DOWN,
                leftKey: Phaser.Keyboard.LEFT,
                rightKey: Phaser.Keyboard.RIGHT,
                fireKey: Phaser.Keyboard.SPACEBAR
            }
        },
        mouse: {
            type: "mouse",
            data: null
        }
    },
    // Array of player ids with no assigned input set.
    _unassignedPlayerIds: [],
    // Object containing input sets that are in use.
    _inputSetsInUse: {},
    // Map from player id to input set id.
    _playerIdInputSetId: {}
});

Inputs.classMethods({
    init: function() {
        Users.addEventListener(Inputs._authenticationEventHandler, Inputs);

        // Assign controls to unassigned players.
        for (let i = 0; i < Inputs._unassignedPlayerIds.length; ++i) {
            OverlayManager.enqueueOverlay(
                TankTrouble.ControlsOverlay,
                {playerId: Inputs._unassignedPlayerIds[i], count: (Inputs._unassignedPlayerIds.length > 1 ? i+1 : undefined)}
            );
        }

    },

    /**
     * Loads input set assignments from cookie.
     * @param array playerIds The player ids of players that are present.
     * @return array Player ids of players that need to be assigned a new input.
     */
    loadInputSetAssignments: function(playerIds) {
        Inputs._unassignedPlayerIds = [];

        const inputSetAssigments = Cookies.getJSON("inputSetAssignments");
        if (inputSetAssigments) {
            const storedPlayerIds = Object.keys(inputSetAssigments);
            // Load and assign all stored input assignments.
            for (let i = 0; i<storedPlayerIds.length; ++i) {
                // Only assign inputs to players that are present.
                if (playerIds.indexOf(storedPlayerIds[i]) !== -1) {
                    Inputs._assignInput(storedPlayerIds[i], inputSetAssigments[storedPlayerIds[i]]);
                }
            }

            // Check if any players are present that had no stored input assignment.
            for (let i = 0; i<playerIds.length; ++i) {
                if (storedPlayerIds.indexOf(playerIds[i]) == -1) {
                    Inputs._unassignedPlayerIds.push(playerIds[i]);
                }
            }
        } else {
            // Queue up input assignment for present players.
            for (let i = 0; i<playerIds.length; ++i) {
                Inputs._unassignedPlayerIds.push(playerIds[i]);
            }
        }

        // Store cleaned up version of input set assignments.
        Inputs._storeInputSetAssignments();

        return Inputs._unassignedPlayerIds;
    },

    getAvailableInputSetId: function() {
        // Find available input set.
        const inputSetIds = Object.keys(Inputs._inputSets);
        for (let i = 0; i < inputSetIds.length; ++i) {
            if (Inputs._inputSetsInUse[inputSetIds[i]] == undefined) {
                return inputSetIds[i];
            }
        }

        return null;
    },

    getAllInputSetIds: function() {
        const inputSetIds = Object.keys(Inputs._inputSets);
        return inputSetIds;
    },

    getUnavailableInputSetIds: function() {
        // Find all unavailable input sets.
        const unavilableInputSetIds = [];
        const inputSetIds = Object.keys(Inputs._inputSets);
        for (let i = 0; i < inputSetIds.length; ++i) {
            if (Inputs._inputSetsInUse[inputSetIds[i]] !== undefined) {
                unavilableInputSetIds.push(inputSetIds[i]);
            }
        }
        return unavilableInputSetIds;
    },

    getAssignedInputSetId: function(playerId) {
        return Inputs._playerIdInputSetId[playerId];
    },

    getInputSetType: function(inputSetId) {
        return Inputs._inputSets[inputSetId].type;
    },

    getFireKey: function(inputSetId) {
        if (Inputs._inputSets[inputSetId].type == "keyboard") {
            return Inputs._inputSets[inputSetId].data.fireKey;
        }

        return null;
    },

    addInputManager: function(playerId, inputSetId) {
        Inputs._releaseInput(playerId);
        Inputs._assignInput(playerId, inputSetId);

        Inputs._storeInputSetAssignments();
    },

    removeInputManager: function(playerId) {
        Inputs._releaseInput(playerId);

        Inputs._storeInputSetAssignments();
    },

    reassignInputManager: function(oldPlayerId, newPlayerId) {
        const inputSetId = Inputs._playerIdInputSetId[oldPlayerId];

        Inputs._releaseInput(oldPlayerId);
        Inputs._assignInput(newPlayerId, inputSetId);

        Inputs._storeInputSetAssignments();
    },

    update: function() {
        for (let i = 0; i < Inputs.inputManagers.length; ++i) {
            Inputs.inputManagers[i].update();
        }
    },

    reset: function() {
        for (let i = 0; i < Inputs.inputManagers.length; ++i) {
            Inputs.inputManagers[i].reset();
        }
    },

    _assignInput: function(playerId, inputSetId) {
        const inputSet = Inputs._inputSets[inputSetId];
        switch(inputSet.type) {
            case Inputs.INPUT_TYPES.KEYBOARD:
            {
                Inputs.inputManagers.push(KeyboardInputManager.create(playerId, inputSet.data));
                break;
            }
            case Inputs.INPUT_TYPES.MOUSE:
            {
                Inputs.inputManagers.push(MouseInputManager.create(playerId));
                break;
            }
        }

        Inputs._inputSetsInUse[inputSetId] = true;
        Inputs._playerIdInputSetId[playerId] = inputSetId;
    },

    _releaseInput: function(playerId) {
        for (let i = 0; i < Inputs.inputManagers.length; ++i) {
            const inputManager = Inputs.inputManagers[i];
            if (inputManager.getPlayerId() == playerId) {
                Inputs.inputManagers.splice(i, 1);
                break;
            }
        }
        delete Inputs._inputSetsInUse[Inputs._playerIdInputSetId[playerId]];
        delete Inputs._playerIdInputSetId[playerId];
    },

    _storeInputSetAssignments: function() {
        Cookies.set("inputSetAssignments", Inputs._playerIdInputSetId);
    },

    _authenticationEventHandler: function(self, evt, data) {
        switch(evt) {
            case Users.EVENTS.PLAYER_AUTHENTICATED:
            case Users.EVENTS.GUEST_ADDED:
            {
                // Assign controls to player.
                OverlayManager.enqueueOverlay(
                    TankTrouble.ControlsOverlay,
                    {playerId: data}
                );

                break;
            }
            case Users.EVENTS.GUESTS_ADDED:
            {
                // Assign controls to players.
                for (let i = 0; i < data.length; ++i) {
                    OverlayManager.enqueueOverlay(
                        TankTrouble.ControlsOverlay,
                        {playerId: data[i], count: (data.length > 1 ? i+1 : undefined)}
                    );
                }

                break;
            }
            case Users.EVENTS.PLAYER_DEAUTHENTICATED:
            case Users.EVENTS.GUEST_REMOVED:
            {
                Inputs.removeInputManager(data);
                break;
            }
        }
    }
});
