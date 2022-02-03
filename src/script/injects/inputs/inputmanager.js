const InputManager = Classy.newClass();

InputManager.fields({
    playerId: null,
    
    log: null
});

InputManager.classFields({
    chatKey: Phaser.Keyboard.ENTER
});

InputManager.classMethods({
    setChatKey: function(chatKey) {
        InputManager.chatKey = chatKey;
    }
});

InputManager.constructor(function(playerId) {
    this.playerId = playerId;
    this.log = Log.create("InputManager");
});

InputManager.methods({
    update: function() {
        const game = GameManager.getGame();

        if (game && game.input.keyboard.downDuration(InputManager.chatKey, 16)) {
            TankTrouble.ChatBox.open();
        }
    },
    
    getPlayerId: function() {
        return this.playerId;
    },
    
    reset: function() {
        this.log.error("Attempt to call InputManager.reset. reset() must be overridden in subclasses");
    }
});
