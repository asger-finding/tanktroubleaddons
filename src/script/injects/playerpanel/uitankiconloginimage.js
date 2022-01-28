//FIXME See if this can be ported to Classy.
UITankIconLoginImage = function(game, size)
{
    this.iconWidth = 0;
    this.iconHeight = 0;
    this.size = size;
    
    switch(this.size) {
        case UIConstants.TANK_ICON_SIZES.SMALL:
        {
            this.iconWidth = UIConstants.TANK_ICON_WIDTH_SMALL;
            this.iconHeight = UIConstants.TANK_ICON_HEIGHT_SMALL;
            break;    
        }
        case UIConstants.TANK_ICON_SIZES.MEDIUM:
        {
            this.iconWidth = UIConstants.TANK_ICON_WIDTH_MEDIUM;
            this.iconHeight = UIConstants.TANK_ICON_HEIGHT_MEDIUM;
            break;    
        }
        case UIConstants.TANK_ICON_SIZES.LARGE:
        {
            this.iconWidth = UIConstants.TANK_ICON_WIDTH_LARGE;
            this.iconHeight = UIConstants.TANK_ICON_HEIGHT_LARGE;
            break;    
        }
    }

    // Call super.
    Phaser.Image.call(this, game, 0, 0, 'addtank');

    this.anchor.setTo(0.5, 0.5);

    this.inputEnabled = true;
    this.input.useHandCursor = true;

    UIUtils.addButton(this, 
        function(self) {
        
        },
        function(self) {
        
        },
        function(self) {
            var gameBounds = self.game.scale.bounds;
            var position = self.toGlobal(new Phaser.Point(0, 0));
            // Scale from game canvas position to pixel position.
            Phaser.Point.divide(position, self.game.scale.scaleFactor, position);
            TankTrouble.AddUserBox.show(gameBounds.x + position.x, gameBounds.y + position.y, "top", Math.abs(self.iconHeight) / self.game.scale.scaleFactor.y * 0.25);
        }, 
        this
    );

    this.spawnTween = null;
    this.removeTween = null;

    // Disable icon.
    this.kill();
    this.scale.set(0.0, 0.0); 
    
    // Create log.
    this.log = Log.create('UITankIconLoginImage');
}

UITankIconLoginImage.prototype = Object.create(Phaser.Image.prototype);
UITankIconLoginImage.prototype.constructor = UITankIconLoginImage;

UITankIconLoginImage.prototype.update = function()
{
}

UITankIconLoginImage.prototype.spawn = function(x, y, targetScale)
{
    // Revive and place the sprite.
    this.reset(x, y);
    this.scale.set(0.0, 0.0); 

    this.targetScale = targetScale || 1.0;

    if (this.removeTween) {
        this.removeTween.stop();
        this.removeTween = null;
    }
    
    var delay = 50 + Math.random() * 200;

    this.spawnTween = this.game.add.tween(this.scale).to({x: this.targetScale, y: this.targetScale}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true, delay);
}

UITankIconLoginImage.prototype.refresh = function(x, y, targetScale)
{
    if (x !== undefined) {
        this.game.add.tween(this).to({x: x}, UIConstants.ELEMENT_MOVE_TIME, Phaser.Easing.Quadratic.InOut, true);
    }
    if (y !== undefined) {
        this.game.add.tween(this).to({y: y}, UIConstants.ELEMENT_MOVE_TIME, Phaser.Easing.Quadratic.InOut, true);
    }
    if (targetScale !== undefined) {
        this.targetScale = targetScale;
        this.game.add.tween(this.scale).to({x: this.targetScale, y: this.targetScale}, UIConstants.ELEMENT_MOVE_TIME, Phaser.Easing.Quadratic.InOut, true);
    }
}

UITankIconLoginImage.prototype.remove = function(animate)
{
    if (this.spawnTween) {
        this.spawnTween.stop();
    }
    
    if (animate) {
        this.removeTween = this.game.add.tween(this.scale).to({x: 0.0, y: 0.0}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None, true);
        this.removeTween.onComplete.add(
            function() {
                this.removeTween = null;
                // Kill the sprite.
                this.kill();
            },
            this
        );
    } else {
        // Kill the sprite.
        this.kill();
    }
}

UITankIconLoginImage.prototype.retire = function()
{
    // Kill the sprite.
    this.kill();
}
