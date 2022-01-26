//FIXME See if this can be ported to Classy.
UITankIconImage = function(game, active, size)
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
    Phaser.Image.call(
        this,
        game,
        0,
        0,
        game.add.bitmapData(
            this.iconWidth,
            this.iconHeight
        )
    );
        
    this.anchor.setTo(0.5, 0.5);

    this.tankIconPlaceholder = this.addChild(new Phaser.Sprite(game, 0, 0, 'tankiconplaceholder-'+this.size));
    this.tankIconPlaceholder.anchor.setTo(0.5, 0.5);

    this.inputEnabled = active;
    if (active) {
        this.input.useHandCursor = true;

        UIUtils.addButton(this, 
            function(self) {
            },
            function(self) {
            },
            function(self) {
                if (self.playerId && self.showingDetails) {
                    var gameBounds = self.game.scale.bounds;
                    var position = self.toGlobal(new Phaser.Point(0, 0));
                    // Scale from game canvas position to pixel position.
                    Phaser.Point.divide(position, self.game.scale.scaleFactor, position);
                    var preferredInfoOffsetHorizontal = Math.abs(self.width) / self.game.scale.scaleFactor.x * 0.4;
                    var preferredInfoOffsetVertical = Math.abs(self.height) / self.game.scale.scaleFactor.y * 0.25;
                    TankTrouble.TankInfoBox.show(gameBounds.x + position.x, gameBounds.y + position.y, self.playerId, preferredInfoOffsetHorizontal, preferredInfoOffsetVertical);
                }
            }, 
            this
        );

    }

    this.playerId = null;
    this.showingDetails = false;

    this.spawnTween = null;
    this.removeTween = null;
    this.updateHideTween = null;
    this.updateShowTween = null;

    // Disable icon.
    this.kill();
    this.scale.set(0.0, 0.0); 
    
    // Create log.
    this.log = Log.create('UITankIconImage');
};

UITankIconImage.prototype = Object.create(Phaser.Image.prototype);
UITankIconImage.prototype.constructor = UITankIconImage;

UITankIconImage.prototype.update = function()
{
};

UITankIconImage.prototype.spawn = function(x, y, playerId, flipped, animate, targetScale)
{
    // Revive and place the sprite.
    this.reset(x, y);
    this.tankIconPlaceholder.revive();
    this.scale.set(0.0, 0.0); 

    // Clear previous tank.
    this.key.clear();
    
    // Store playerId.
    this.playerId = playerId;
    this.flipped = flipped;
    this.targetScale = targetScale || 1.0;

    var delay = 50 + Math.random() * 200;

    if (this.removeTween) {
        this.removeTween.stop();
        this.removeTween = null;
    }
    if (animate) {
        this.spawnTween = this.game.add.tween(this.scale).to({x: (this.flipped ? -this.targetScale : this.targetScale), y: this.targetScale}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true, delay);
    } else {
        this.scale.set((this.flipped ? -this.targetScale : this.targetScale), this.targetScale);
    }

    // Load player tank icon.
    UITankIcon.loadPlayerTankIcon(this.key.canvas, this.size, this.playerId, 
        function(self) {
            // Clear placeholder and bitmap and draw correct icon.
            self.tankIconPlaceholder.kill();
            self.key.clear();

            self.showingDetails = true;
        }, this);
};

UITankIconImage.prototype.refresh = function(x, y, targetScale)
{
    if (x !== undefined) {
        this.game.add.tween(this).to({x: x}, UIConstants.ELEMENT_MOVE_TIME, Phaser.Easing.Quadratic.InOut, true);
    }
    if (y !== undefined) {
        this.game.add.tween(this).to({y: y}, UIConstants.ELEMENT_MOVE_TIME, Phaser.Easing.Quadratic.InOut, true);
    }
    if (targetScale !== undefined) {
        this.targetScale = targetScale;
        this.game.add.tween(this.scale).to({x: (this.flipped ? -this.targetScale : this.targetScale), y: this.targetScale}, UIConstants.ELEMENT_MOVE_TIME, Phaser.Easing.Quadratic.InOut, true);
    }
};

UITankIconImage.prototype.updateIcon = function() {
    if (this.spawnTween) {
        this.spawnTween.stop();
    }
    
    // Only update if we are not in the process of removing icon.
    if (!this.removeTween) {
        if (this.updateHideTween) {
            this.updateHideTween.stop();
        }
        if (this.updateShowTween) {
            this.updateShowTween.stop();
        }
        this.updateHideTween = this.game.add.tween(this.scale).to({x: 0.0, y: 0.0}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None);
        this.updateShowTween = this.game.add.tween(this.scale).to({x: (this.flipped ? -this.targetScale : this.targetScale), y: this.targetScale}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out);

        this.updateHideTween.onComplete.add(
            function() {
                // Load player tank icon.
                UITankIcon.loadPlayerTankIcon(this.key.canvas, this.size, this.playerId, 
                    function(self) {
                        // Clear placeholder and bitmap and draw correct icon.
                        self.tankIconPlaceholder.kill();
                        self.key.clear();
                        
                        self.updateShowTween.start();
                    }, this);
                
            }, 
            this
        );
        
        this.updateHideTween.start();
    }
};

UITankIconImage.prototype.remove = function()
{
    this.showingDetails = false;

    if (this.spawnTween) {
        this.spawnTween.stop();
    }

    if (this.updateHideTween) {
        this.updateHideTween.stop();
    }

    if (this.updateShowTween) {
        this.updateShowTween.stop();
    }

    this.removeTween = this.game.add.tween(this.scale).to({x: 0.0, y: 0.0}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None, true);
    this.removeTween.onComplete.add(
        function() {
            this.removeTween = null;
            // Kill the sprite.
            this.kill();
        },
        this
    );
};

UITankIconImage.prototype.retire = function()
{
    // Kill the sprite.
    this.kill();
};
