//FIXME See if this can be ported to Classy.
UILaserGraphics = function(game, gameController)
{
    // Call super.
    Phaser.Graphics.call(this, game, 0, 0);
    
    this.gameController = gameController;

    // State.
    this.laserPositions = [];
    this.retracting = false;
    this.expanding = true;
    this.colour = 0x00ff00;
    this.timeAlive = 0.0;

    // Disable laser.
    this.kill();
};

UILaserGraphics.prototype = Object.create(Phaser.Graphics.prototype);
UILaserGraphics.prototype.constructor = UILaserGraphics;

UILaserGraphics.prototype.update = function()
{
    // Check if exists or game is frozen.
    if (!this.exists || this.game.physics.arcade.isPaused) {
        return;
    }

    this.timeAlive += this.game.time.physicsElapsed;

    if (this.retracting) {
        if (this.laserPositions.length == 0) {
            // Kill the graphics.
            this.kill();
        } else {
            this.laserPositions.shift();
            while (this.laserPositions.length > 0) {
                if (this.laserPositions[0].updatePoint) {
                    break;
                }
                this.laserPositions.shift();
            }
        }
    } else {
        if (this.timeAlive >= UIConstants.LASER_RETRACTION_TIME) {
            this.retracting = true;
        }
    }
    
    if (this.expanding) {
        // Add position from game model.
        var laser = this.gameController.getProjectile(this.laserId);
        if (laser)
        {
            this.laserPositions.push({x: UIUtils.mpx(laser.getX()), y: UIUtils.mpx(laser.getY()), updatePoint: true})
        }
    }

    // Draw graphics.
    this.clear();
    this.lineStyle(UIConstants.LASER_WIDTH, this.colour, 1.0);
    
    
    if (this.laserPositions.length >= 2) {
        this.moveTo(this.laserPositions[0].x, this.laserPositions[0].y);
        for (var i = 1; i < this.laserPositions.length; ++i) {
            this.lineTo(this.laserPositions[i].x, this.laserPositions[i].y);
        }
    }
};

UILaserGraphics.prototype.spawn = function(x, y, laserId, playerId)
{
    // Revive the graphics.
    this.revive();
    
    // Store laserId and playerId.
    this.laserId = laserId;
    this.playerId = playerId;
    
    // Reset state.
    this.laserPositions = [];
    var tank = this.gameController.getTank(this.playerId);
    if (tank) {
        this.laserPositions.push({x: UIUtils.mpx(tank.getX()), y: UIUtils.mpx(tank.getY()), updatePoint: false});
    }
    this.laserPositions.push({x: x, y: y, updatePoint: true});
    this.expanding = true;
    this.retracting = false;
    this.colour = 0x00ff00;
    this.timeAlive = 0.0;

    // Send request for player details.
    var self = this;
    Backend.getInstance().getPlayerDetails(
        function(result) {
            if (typeof(result) == "object") {
                self.colour = result.getTurretColour().numericValue;
            } else {
                self.colour = UIConstants.TANK_UNAVAILABLE_COLOUR.numericValue;
            }
        },
        function(result) {
            
        },
        function(result) {
            
        },
        this.playerId, Caches.getPlayerDetailsCache()
    );
};

UILaserGraphics.prototype.addPoint = function(x, y)
{
    if (this.expanding) {
        this.laserPositions.push({x: x, y: y, updatePoint: false});
    }
};

UILaserGraphics.prototype.remove = function()
{
    this.expanding = false;
    this.retracting = true;
};

UILaserGraphics.prototype.retire = function()
{
    // Kill the graphics.
    this.kill();
};
