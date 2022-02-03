//FIXME See if this can be ported to Classy.
UIChatSymbolImage = function(game, gameController)
{
    // Call super.
    Phaser.Image.call(this, game, 0, 0, 'game', 'chat');
    
    this.gameController = gameController;
        
    this.anchor.set(0.1, 0.9);

    this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);

    // State.
    this.timeAlive = 0.0;
    this.spawnTween = null;
    this.removeTween = null;
    this.scale.set(0.0, 0.0); 

    // Disable sprite.
    this.kill();
    
    // Create log.
    this.log = Log.create('UIChatSymbolImage');
}

UIChatSymbolImage.prototype = Object.create(Phaser.Image.prototype);
UIChatSymbolImage.prototype.constructor = UIChatSymbolImage;

UIChatSymbolImage.prototype.update = function()
{
    // Check if exists or game is frozen.
    if (!this.exists || this.game.physics.arcade.isPaused) {
        return;
    }

    const tank = this.gameController.getTank(this.playerId);
    if (tank)
    {
        if (!this.removeTween && (tank.getSpeed() != 0 || tank.getRotationSpeed() != 0)) {
            this.hide();
        }
        
        this.x = UIUtils.mpx(tank.getX()) + Constants.TANK.HEIGHT.px * 0.5;
        this.y = UIUtils.mpx(tank.getY()) - Constants.TANK.HEIGHT.px * 0.5;
    
        this.timeAlive += this.game.time.delta / 1000;
    
        if (this.timeAlive > UIConstants.CHAT_SYMBOL_DISPLAY_TIME && !this.removeTween) {
            this.hide();
        }
    }
}

UIChatSymbolImage.prototype.spawn = function(playerId)
{
    const tank = this.gameController.getTank(playerId);
    if (tank)
    {
        // Revive and place the sprite.
        const position = {x: UIUtils.mpx(tank.getX()), y: UIUtils.mpx(tank.getY())};
        this.reset(position.x + Constants.TANK.HEIGHT.px * 0.5, position.y - Constants.TANK.HEIGHT.px * 0.5);
        this.scale.set(0.0, 0.0); 

        if (this.removeTween) {
            this.removeTween.stop();
            this.removeTween = null;
        }

        this.spawnTween = this.game.add.tween(this.scale).to({x: UIConstants.GAME_ASSET_SCALE, y: UIConstants.GAME_ASSET_SCALE}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true);    
    }
    
    // Store playerId.
    this.playerId = playerId;

    // Reset state.
    this.timeAlive = 0.0;
    this.removeTween = null;
}

UIChatSymbolImage.prototype.refresh = function() 
{
    const tank = this.gameController.getTank(this.playerId);
    if (tank)
    {
        // Reset time alive.
        this.timeAlive = 0.0;
    
        if (this.removeTween) {
            this.removeTween.stop();
            this.removeTween = null;
        
            this.spawnTween = this.game.add.tween(this.scale).to({x: UIConstants.GAME_ASSET_SCALE, y: UIConstants.GAME_ASSET_SCALE}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true);
        }
    }
}

UIChatSymbolImage.prototype.hide = function()
{
    if (this.spawnTween) {
        this.spawnTween.stop();
        this.spawnTween = null;
    }

    this.removeTween = this.game.add.tween(this.scale).to({x: 0.0, y: 0.0}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None, true);
}

UIChatSymbolImage.prototype.remove = function()
{
    if (!this.removeTween) {
        this.hide();
    }
    this.removeTween.onComplete.add(
        function() {
            // Kill the sprite.
            this.kill();
        },
        this
    );
}

UIChatSymbolImage.prototype.retire = function()
{
    // Kill the sprite.
    this.kill();
}
