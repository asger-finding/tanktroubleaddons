//FIXME See if this can be ported to Classy.
UIProjectileImage = function(game, gameController)
{
    // Call super.
    Phaser.Image.call(this, game, 0, 0, 'game', '');
    
    this.gameController = gameController;

    this.anchor.setTo(0.5, 0.5);

    this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);

    // Disable bullet.
    this.kill();
};

UIProjectileImage.prototype = Object.create(Phaser.Image.prototype);
UIProjectileImage.prototype.constructor = UIProjectileImage;

UIProjectileImage.prototype.update = function()
{
    if (!this.exists) {
        return;
    }

    // Update position from game model.
    var projectile = this.gameController.getProjectile(this.projectileId);
    if (projectile)
    {
        this.x = UIUtils.mpx(projectile.getX());
        this.y = UIUtils.mpx(projectile.getY());
    }
};

UIProjectileImage.prototype.spawn = function(x, y, projectileId, frameName)
{
    this.frameName = frameName;

    // Revive and place the image.
    this.reset(x, y);
    
    // Store projectileId.
    this.projectileId = projectileId;
};

UIProjectileImage.prototype.remove = function()
{
    // Kill the image.
    this.kill();
};

UIProjectileImage.prototype.retire = function()
{
    // Kill the image.
    this.kill();
};
