var MouseInputManager = InputManager.subclass();

MouseInputManager.fields({
    mouseX: 0,
    mouseY: 0,
    storedStates: {}
});


MouseInputManager.classFields({
    mouseMoveListenerAdded: false,
    mousePageX: 0,
    mousePageY: 0,
    mouseActivated: false,
    mouseDown: false
});

MouseInputManager.constructor(function(playerId) {
    this._super(playerId);
    
    if (!MouseInputManager.mouseMoveListenerAdded) {
        $(document).on("mousemove", function(event) {
            MouseInputManager.mouseActivated = true;
            MouseInputManager.mousePageX = event.pageX;
            MouseInputManager.mousePageY = event.pageY;
        });
        $("#content").on("mousedown", function(event) {
            MouseInputManager.mouseActivated = true;
            MouseInputManager.mouseDown = true;
        });
        $("#content").on("mouseup", function(event) {
            MouseInputManager.mouseDown = false;
        });
        $("#content").on("mouseout", function(event) {
            MouseInputManager.mouseDown = false;
        });
        MouseInputManager.mouseMoveListenerAdded = true;
    }
    
    this.reset();
});

MouseInputManager.methods({
    update: function() {
        this._super();

        const game = GameManager.getGame();

        if (game) {
            let forwardState = false;
            let backState = false;
            let leftState = false;
            let rightState = false;
            let fireState = false;
            
            const gameBounds = game.scale.bounds;
            const gameScale = game.scale.scaleFactor;

            this.mouseX = (MouseInputManager.mousePageX - gameBounds.x) * gameScale.x;
            this.mouseY = (MouseInputManager.mousePageY - gameBounds.y) * gameScale.y;

            if (game.input.enabled && MouseInputManager.mouseActivated) {
                if (game.state.getCurrentState().getTankSprite) {
                    const tankSprite = game.state.getCurrentState().getTankSprite(this.playerId);
                
                    if (tankSprite) {
                        // FIXME This code is more or less duplicated in AI.js

                        const relativeToTank = tankSprite.toLocal(new Phaser.Point(this.mouseX, this.mouseY));
                    
                        const magnitude = relativeToTank.getMagnitude();
                        const angle = Phaser.Math.angleBetween(0, 0, relativeToTank.x, relativeToTank.y);

                        const canReverse = magnitude < UIConstants.MOUSE_INPUT.MAX_REVERSE_DISTANCE / UIConstants.GAME_ASSET_SCALE;
                        let goInReverse = false;
                    
                        // Normally it would be < 0.0, but the tank graphics is rotated 90 degrees CCW
                        if (angle > Math.PI * 0.5 + UIConstants.MOUSE_INPUT.ROTATION_DEAD_ANGLE || angle < -Math.PI * 0.5 - UIConstants.MOUSE_INPUT.ROTATION_DEAD_ANGLE) {
                            // Turn left unless it's better to reverse.
                            if (angle > 0 && canReverse) {
                                rightState = true;
                                goInReverse = true;
                            } else {
                                leftState = true;
                            }
                        } else if (angle > -Math.PI * 0.5 + UIConstants.MOUSE_INPUT.ROTATION_DEAD_ANGLE && angle < Math.PI * 0.5 - UIConstants.MOUSE_INPUT.ROTATION_DEAD_ANGLE) {
                            // Turn right unless it's better to reverse.
                            if (angle > 0 && canReverse) {
                                leftState = true;
                                goInReverse = true;
                            } else {
                                rightState = true;
                            }
                        } else if (angle > 0) { // If true, the mouse must be directly behind the tank.
                            if (canReverse) {
                                // Back straight.
                                goInReverse = true;
                            } else {
                                // Turn to face direction.
                                if (angle > Math.PI * 0.5) {
                                    leftState = true;
                                } else {
                                    rightState = true;
                                }
                            }
                        }    
                    
                        // Only drive if out of dead zone.
                        if (magnitude > UIConstants.MOUSE_INPUT.POSITION_DEAD_DISTANCE / UIConstants.GAME_ASSET_SCALE) {
                            // If within reverse zone, let previous computations determine if we reverse or not.
                            // Otherwise, only go forwards if the tank is almost facing the right direction.
                            if (canReverse) {
                                forwardState = !goInReverse;
                                backState = goInReverse;
                            } else if (angle > -Math.PI * 0.5 - UIConstants.MOUSE_INPUT.POSITION_DEAD_ANGLE && angle < -Math.PI * 0.5 + UIConstants.MOUSE_INPUT.POSITION_DEAD_ANGLE) {
                                forwardState = true;
                            }                            
                        }
                    }
                }

                fireState = MouseInputManager.mouseDown || game.input.mousePointer.leftButton.isDown;
            }

            let stateChanged = false;
            stateChanged |= this.storedStates["forward"] !== forwardState;
            stateChanged |= this.storedStates["back"] !== backState;
            stateChanged |= this.storedStates["left"] !== leftState;
            stateChanged |= this.storedStates["right"] !== rightState;
            stateChanged |= this.storedStates["fire"] !== fireState;

            const gameController = GameManager.getGameController();

            if (stateChanged && gameController) {
                const inputState = InputState.withState(this.playerId, forwardState, backState, leftState, rightState, fireState);
                gameController.setInputState(inputState);
            }

            this.storedStates["forward"] = forwardState;
            this.storedStates["back"] = backState;
            this.storedStates["left"] = leftState;
            this.storedStates["right"] = rightState;
            this.storedStates["fire"] = fireState;            
        }
    },
    
    reset: function() {
        MouseInputManager.mouseActivated = false;

        this.storedStates["forward"] = false;
        this.storedStates["back"] = false;
        this.storedStates["left"] = false;
        this.storedStates["right"] = false;
        this.storedStates["fire"] = false;
    }
});
