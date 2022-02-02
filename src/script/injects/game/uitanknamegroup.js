//FIXME See if this can be ported to Classy.
UITankNameGroup = function(game, gameController)
{
    // Call super.
    Phaser.Group.call(this, game, null);
 
    this.gameController = gameController;
        
    this.tankName = this.addChild(new Phaser.Text(game, 0, 0, '', {font: UIConstants.TANK_NAME_FONT_SIZE+"px TankTrouble", fill: "#fff", strokeThickness: UIConstants.TANK_NAME_STROKE_WIDTH}));
    this.tankName.anchor.setTo(0.5, 0.0);

    // Ignore GAME_ASSET_SCALE for this text. As it will not be rotated, we can just use the high-resolution, retina font size.
    //this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);

    this.playerId = null;

    // State.
    this.timeAlive = 0.0;
    this.fading = false;

    // Disable tank name.
    this.exists = false;
    this.visible = false;
    
    // Create log.
    this.log = Log.create('UITankNameGroup');
};

UITankNameGroup.prototype = Object.create(Phaser.Group.prototype);
UITankNameGroup.prototype.constructor = UITankNameGroup;

UITankNameGroup.prototype.update = function()
{
    // Check if exists or game is frozen.
    if (!this.exists || this.game.physics.arcade.isPaused) {
        return;
    }

    var tank = this.gameController.getTank(this.playerId);
    if (tank)
    {
        this.x = UIUtils.mpx(tank.getX());
        this.y = UIUtils.mpx(tank.getY()) + Constants.TANK.HEIGHT.px * 0.7;

        // Push name clear of edges.
        var halfWorldWidth = this.tankName.width * this.tankName.worldScale.x * 0.5;
        var worldPosition = this.parent.toGlobal(this.position);

        if (worldPosition.x - halfWorldWidth < UIConstants.TANK_NAME_MARGIN) {
            this.x = this.parent.toLocal({x: UIConstants.TANK_NAME_MARGIN + halfWorldWidth, y: worldPosition.y}).x;
        } else if (worldPosition.x + halfWorldWidth > this.game.width - UIConstants.TANK_NAME_MARGIN) {
            this.x = this.parent.toLocal({x: this.game.width - UIConstants.TANK_NAME_MARGIN - halfWorldWidth, y: worldPosition.y}).x;
        }

        this.timeAlive += this.game.time.delta / 1000;
    
        if (!this.fading && this.timeAlive > UIConstants.TANK_NAME_DISPLAY_TIME) {
            // Start fading out.
            this.fading = true;
        }
    } else {
        this.fading = true;
    }

    
    if (this.fading) {
        this.alpha = Math.max(0.0, this.alpha - 0.025);
    }

    // Disable when all faded out.
    if (this.alpha == 0.0) {
        this.exists = false;
        this.visible = false;
    }
};

UITankNameGroup.prototype.postUpdate = function() {
    if (!this.exists) {
        return;
    }

    // Call super.
    Phaser.Group.prototype.postUpdate.call(this);
};

UITankNameGroup.prototype.spawn = function(playerId)
{
    // Revive and place the group.
    var tank = this.gameController.getTank(playerId);
    if (tank)
    {
        this.x = UIUtils.mpx(tank.getX());
        this.y = UIUtils.mpx(tank.getY()) + Constants.TANK.HEIGHT.px * 0.7;
        this.exists = true;
        this.visible = true;
        this.alpha = 1.0;

        this.tankName.setText("");
    }

    // Store playerId.
    this.playerId = playerId;

    // Reset state.
    this.timeAlive = 0.0;
    this.fading = false;

    // Send request for player details.
    var self = this;
    Backend.getInstance().getPlayerDetails(
        function(result) {
            if (typeof(result) == "object") {
                var username = Utils.maskUnapprovedUsername(result);
                self.tankName.setText(username);
            }
        },
        function(result) {
            
        },
        function(result) {
            
        },
        this.playerId, Caches.getPlayerDetailsCache()
    );
};

UITankNameGroup.prototype.retire = function()
{
    this.exists = false;
    this.visible = false;
};
