//FIXME See if this can be ported to Classy.
UICounterOvertimeGroup = function(game, gameController)
{
    // Call super.
    Phaser.Group.call(this, game, null);

    this.gameController = gameController;

    this.message = this.addChild(new Phaser.Text(game, 0, 0, 'OVERTIME', {font: UIConstants.TIMER_FONT_SIZE+"px TankTrouble", fontWeight: "bold", fill: "#ffffff", stroke: "#000000", strokeThickness: UIConstants.TIMER_STROKE_WIDTH}));
    this.message.anchor.setTo(0.5, 0.5);

    this.message.kill();

    this.exists = false;
    this.visible = false;
};

UICounterOvertimeGroup.prototype = Object.create(Phaser.Group.prototype);
UICounterOvertimeGroup.prototype.constructor = UICounterOvertimeGroup;

UICounterOvertimeGroup.prototype.update = function()
{
    // Check if exists.
    if (!this.exists || this.game.physics.arcade.isPaused) {
        return;
    }

    this.animationTimer += this.game.time.delta / 1000;
    this.message.tint = Phaser.Color.interpolateColor(UIConstants.OVERTIME_BLINK_COLORS[0], UIConstants.OVERTIME_BLINK_COLORS[1], 1.0, Math.cos(this.animationTimer * UIConstants.OVERTIME_BLINK_SPEED) * 0.5 + 0.5, 0);// 0xff0000 + currentSeconds * 0x001919;
};

UICounterOvertimeGroup.prototype.postUpdate = function() {
    if (!this.exists) {
        return;
    }

    // Call super.
    Phaser.Group.prototype.postUpdate.call(this);
};

UICounterOvertimeGroup.prototype.spawn = function(x, y, counterId, animate) {
    // Revive and place the group.
    this.exists = true;
    this.visible = true;
    this.x = x;
    this.y = y;

    this.message.revive();
    this.message.tint = 0xffffff;

    // Reset state.
    this.counterId = counterId;
    this.animationTimer = 0.0;

    if (this.scaleTween) {
        this.scaleTween.stop();
        this.scaleTween = null;
    }

    this.message.scale.setTo(1.0, 1.0);
    this.scaleTween = this.game.add.tween(this.message.scale).to({x: UIConstants.OVERTIME_SCALE, y: UIConstants.OVERTIME_SCALE}, UIConstants.OVERTIME_SCALE_TIME, Phaser.Easing.Cubic.InOut, true, 0, -1, true);

    if (this.removeTween) {
        this.removeTween.stop();
        this.removeTween = null;
    }

    if (animate) {
        this.scale.setTo(0.0, 0.0);
        this.spawnTween = this.game.add.tween(this.scale).to({x: UIConstants.ASSET_SCALE, y: UIConstants.ASSET_SCALE}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true);
    } else {
        this.scale.setTo(UIConstants.ASSET_SCALE, UIConstants.ASSET_SCALE);
    }
};

UICounterOvertimeGroup.prototype.getPlayerId = function()
{
    return null;
};

UICounterOvertimeGroup.prototype.remove = function()
{
    if (this.spawnTween) {
        this.spawnTween.stop();
        this.spawnTween = null;
    }

    if (this.scaleTween) {
        this.scaleTween.stop();
        this.scaleTween = null;
    }

    this.removeTween = this.game.add.tween(this.scale).to({x: 0, y: 0}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None, true);
    this.removeTween.onComplete.add(
        function() {
            this.message.kill();

            // Kill the group.
            this.exists = false;
            this.visible = false;

        },
        this
    );
};

UICounterOvertimeGroup.prototype.retire = function()
{
    if (this.spawnTween) {
        this.spawnTween.stop();
    }

    if (this.scaleTween) {
        this.scaleTween.stop();
    }

    this.message.kill();

    // Kill the group.
    this.exists = false;
    this.visible = false;
};
