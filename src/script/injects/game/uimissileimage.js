//FIXME See if this can be ported to Classy.
UIMissileImage = function(game, gameController, targetingSound)
{
    // Call super.
    Phaser.Image.call(this, game, 0, 0, 'game', '');
    
    this.gameController = gameController;
    this.targetingSound = targetingSound;

    // State.
    this.targetId = null;
    this.targetTime = 0;

    this.anchor.setTo(0.5, 0.5);

    this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);

    // Disable missile.
    this.kill();
};

UIMissileImage.prototype = Object.create(Phaser.Image.prototype);
UIMissileImage.prototype.constructor = UIMissileImage;

UIMissileImage.prototype.update = function()
{
    if (!this.exists) {
        return;
    }

    // Call super.
    Phaser.Image.prototype.update.call(this);

    this.smokeEmitter.update();

    // Play targeting sound depending on distance to target.
    if (this.targetId !== null) {
        var projectile = this.gameController.getProjectile(this.projectileId);
        var tank = this.gameController.getTank(this.targetId);
        var maze = this.gameController.getMaze();
        if (projectile && tank && maze) {
            this.targetTime += this.game.time.physicsElapsed;

            var projectilePosition = {
                x: Math.floor(projectile.getX() / Constants.MAZE_TILE_SIZE.m),
                y: Math.floor(projectile.getY() / Constants.MAZE_TILE_SIZE.m)
            };
            var tankPosition = {
                x: Math.floor(tank.getX() / Constants.MAZE_TILE_SIZE.m),
                y: Math.floor(tank.getY() / Constants.MAZE_TILE_SIZE.m)
            };
            var distanceToTarget = maze.getDistanceBetweenPositions(projectilePosition, tankPosition);
            if (distanceToTarget !== false) {
                if (this.targetTime > (distanceToTarget + 1) * UIConstants.MISSILE_TARGETING_SOUND_INTERVAL_PER_TILE) {
                    this.targetTime = 0;
                    this.targetingSound.play();
                }
            }
        }
    }

    // Update position and rotation from game model.
    var projectile = this.gameController.getProjectile(this.projectileId);
    if (projectile)
    {
        this.x = UIUtils.mpx(projectile.getX());
        this.y = UIUtils.mpx(projectile.getY());

        this.rotation = Math.atan2(projectile.getSpeedY(), projectile.getSpeedX()) + Math.PI * 0.5;
    }
};

UIMissileImage.prototype.setSmokeEmitter = function(smokeEmitter) {
    this.smokeEmitter = smokeEmitter;
}

UIMissileImage.prototype.updateTarget = function(playerId) {
    this.targetId = playerId;
    this.targetTime = 0;

    if (playerId !== null) {
        // Send request for player details.
        var self = this;
        Backend.getInstance().getPlayerDetails(
            function(result) {
                if (typeof(result) == "object") {
                    self.smokeEmitter.setSmokeColour(result.getBaseColour().numericValue);
                } else {
                    self.smokeEmitter.setSmokeColour(UIConstants.MISSILE_SMOKE_COLOUR);
                }
            },
            function(result) {

            },
            function(result) {

            },
            playerId, Caches.getPlayerDetailsCache()
        );
    } else {
        this.smokeEmitter.setSmokeColour(UIConstants.MISSILE_SMOKE_COLOUR);
    }

};

UIMissileImage.prototype.spawn = function(x, y, projectileId, playerId, frameName)
{
    this.frameName = frameName;

    // Revive and place the image.
    this.reset(x, y);
    
    // Store projectileId and playerId.
    this.projectileId = projectileId;
    this.playerId = playerId;

    // Reset state.
    this.targetId = null;
    this.targetTime = 0;

    // Send request for player details.
    var self = this;
    Backend.getInstance().getPlayerDetails(
        function(result) {
            if (typeof(result) == "object") {
                self.tint = result.getTurretColour().numericValue;
            } else {
                self.tint = UIConstants.TANK_UNAVAILABLE_COLOUR.numericValue;
            }
        },
        function(result) {

        },
        function(result) {

        },
        this.playerId, Caches.getPlayerDetailsCache()
    );

    this.smokeEmitter.spawn(x, y, QualityManager.getQualityValue(QualityManager.QUALITY_PARAMETERS.MISSILE_SMOKE_FREQUENCY), UIConstants.MISSILE_SMOKE_COLOUR);
};

UIMissileImage.prototype.remove = function()
{
    // Kill the image.
    this.kill();
};

UIMissileImage.prototype.retire = function()
{
    // Kill the image.
    this.kill();
};
