//FIXME See if this can be ported to Classy.
UITankAvatarGroup = function(game)
{
    // Call super.
    Phaser.Group.call(this, game, null);

    this.avatarSpine = null;
    this.name = null;
    this.playerId = null;

    this.spawnTween = null;
    this.removeTween = null;

    // Disable group.
    this.scale.set(0.0, 0.0); 
    this.exists = false;
    this.visible = false;

    // Create log.
    this.log = Log.create('UITankAvatarGroup');
};

UITankAvatarGroup.prototype = Object.create(Phaser.Group.prototype);
UITankAvatarGroup.prototype.constructor = UITankAvatarGroup;

UITankAvatarGroup.prototype.update = function()
{
    if (!this.exists) {
        return;
    }

    // Call super.
    Phaser.Group.prototype.update.call(this);
};

UITankAvatarGroup.prototype.postUpdate = function() {
    if (!this.exists) {
        return;
    }

    // Call super.
    Phaser.Group.prototype.postUpdate.call(this);
};

UITankAvatarGroup.prototype.spawn = function(x, y, playerId, animate, targetScale)
{
    // Revive and place the group.
    this.exists = true;
    this.visible = true;
    this.x = x;
    this.y = y;
    
    // Store playerId.
    this.playerId = playerId;
    this.targetScale = targetScale || 1.0;

    // Create avatar.
    if (AIs.isReady() && AIs.isAI(this.playerId)) {
        var ai = AIs.getAI(this.playerId);
        this.name = ai.name;
        switch(this.name) {
            case "Laika":
            {
                this.avatarSpine = this.addChild(new UILaikaSpine(this.game, UIConstants.AVATAR_LAIKA_X, UIConstants.AVATAR_LAIKA_Y, this.playerId, true));
                this.targetScale *= UIConstants.AVATAR_LAIKA_SCALE;
                break;
            }
            case "Dimitri":
            {
                this.avatarSpine = this.addChild(new UIDimitriSpine(this.game, UIConstants.AVATAR_DIMITRI_X, UIConstants.AVATAR_DIMITRI_Y, this.playerId));
                this.targetScale *= UIConstants.AVATAR_DIMITRI_SCALE;
                break;
            }
        }

        this.avatarSpine.anchor.setTo(0.5, 0.5);
        this.avatarSpine.idle();
    }

    var delay = 50 + Math.random() * 200;

    if (this.removeTween) {
        this.removeTween.stop();
        this.removeTween = null;
    }

    if (animate) {
        this.spawnTween = this.game.add.tween(this.scale).to({x: -this.targetScale, y: this.targetScale}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Back.Out, true, delay);
    } else {
        this.scale.set(-this.targetScale, this.targetScale);
    }
};

UITankAvatarGroup.prototype.refresh = function(x, y, targetScale)
{
    if (x !== undefined) {
        this.game.add.tween(this).to({x: x}, UIConstants.ELEMENT_MOVE_TIME, Phaser.Easing.Quadratic.InOut, true);
    }
    if (y !== undefined) {
        this.game.add.tween(this).to({y: y}, UIConstants.ELEMENT_MOVE_TIME, Phaser.Easing.Quadratic.InOut, true);
    }
    if (targetScale !== undefined) {
        this.targetScale = targetScale;

        switch(this.name) {
            case "Laika":
            {
                this.targetScale *= UIConstants.AVATAR_LAIKA_SCALE;
                break;
            }
            case "Dimitri":
            {
                this.targetScale *= UIConstants.AVATAR_DIMITRI_SCALE;
                break;
            }
        }

        this.game.add.tween(this.scale).to({x: -this.targetScale, y: this.targetScale}, UIConstants.ELEMENT_MOVE_TIME, Phaser.Easing.Quadratic.InOut, true);
    }
};

UITankAvatarGroup.prototype.remove = function()
{
    if (this.spawnTween) {
        this.spawnTween.stop();
    }

    this.removeTween = this.game.add.tween(this.scale).to({x: 0.0, y: 0.0}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Linear.None, true);
    this.removeTween.onComplete.add(
        function() {
            if (this.avatarSpine) {
                // Kill the avatar.
                this.avatarSpine.retire();
                this.removeChild(this.avatarSpine);
                this.avatarSpine.destroy();
                this.avatarSpine = null;
            }

            // Kill the group.
            this.exists = false;
            this.visible = false;
        },
        this
    );
};

UITankAvatarGroup.prototype.retire = function()
{
    if (this.avatarSpine) {
        // Kill the avatar.
        this.avatarSpine.retire();
        this.removeChild(this.avatarSpine);
        this.avatarSpine.destroy();
        this.avatarSpine = null;
    }

    // Kill the group.
    this.exists = false;
    this.visible = false;
};
