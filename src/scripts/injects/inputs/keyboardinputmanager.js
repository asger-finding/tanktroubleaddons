const KeyboardInputManager = InputManager.subclass();

KeyboardInputManager.fields({
    forwardKey: null,
    backKey: null,
    leftKey: null,
    rightKey: null,
    fireKey: null,
    keyStates: {}
});

KeyboardInputManager.constructor(function(playerId, data) {
    this._super(playerId);
    this.forwardKey = data.forwardKey;
    this.backKey = data.backKey;
    this.leftKey = data.leftKey;
    this.rightKey = data.rightKey;
    this.fireKey = data.fireKey;
    
    this.reset();
});

KeyboardInputManager.methods({
    update: function() {
        this._super();

        const game = GameManager.getGame();

        if (game) {
            let forwardState = false;
            let backState = false;
            let leftState = false;
            let rightState = false;
            let fireState = false;

            if (game.input.enabled) {
                forwardState = game.input.keyboard.isDown(this.forwardKey) || false;
                backState = game.input.keyboard.isDown(this.backKey) || false;
                leftState = game.input.keyboard.isDown(this.leftKey) || false;
                rightState = game.input.keyboard.isDown(this.rightKey) || false;
                fireState = game.input.keyboard.isDown(this.fireKey) || false;
            }

            let stateChanged = false;
            stateChanged |= this.keyStates[this.forwardKey] !== forwardState;
            stateChanged |= this.keyStates[this.backKey] !== backState;
            stateChanged |= this.keyStates[this.leftKey] !== leftState;
            stateChanged |= this.keyStates[this.rightKey] !== rightState;
            stateChanged |= this.keyStates[this.fireKey] !== fireState;

            const gameController = GameManager.getGameController();

            if (stateChanged && gameController) {
                const inputState = InputState.withState(this.playerId, forwardState, backState, leftState, rightState, fireState);
                gameController.setInputState(inputState);
            }

            this.keyStates[this.forwardKey] = forwardState;
            this.keyStates[this.backKey] = backState;
            this.keyStates[this.leftKey] = leftState;
            this.keyStates[this.rightKey] = rightState;
            this.keyStates[this.fireKey] = fireState;            
        }
    },
    
    reset: function() {
        this.keyStates[this.forwardKey] = false;
        this.keyStates[this.backKey] = false;
        this.keyStates[this.leftKey] = false;
        this.keyStates[this.rightKey] = false;
        this.keyStates[this.fireKey] = false;
    }
});
