//FIXME See if this can be ported to Classy.
UIRubbleGroup = function(game)
{
    // Call super.
    Phaser.Group.call(this, game, null);
    
    // Create fragment group.
    this.fragmentGroup = this.game.add.group(this);

    // Add pool of fragments.
    for (var i = 0; i < UIConstants.RUBBLE_FRAGMENT_POOL_SIZE; ++i) {
        this.fragmentGroup.add(new UIRubbleFragmentSprite(game));
    }

    // Create smoke emitter.
    this.emitter = this.add(new UIRubbleEmitter(game));
    
    // Create log.
    this.log = Log.create('UIRubbleGroup');

    // Disable rubble.
    this.exists = false;
    this.visible = false;
}

UIRubbleGroup.prototype = Object.create(Phaser.Group.prototype);
UIRubbleGroup.prototype.constructor = UIRubbleGroup;

UIRubbleGroup.prototype.update = function() {
    if (!this.exists) {
        return;
    }

    // Call super.
    Phaser.Group.prototype.update.call(this);

    // Disable when all children are dead.
    if (this.countLiving() <= 1 && this.fragmentGroup.countLiving() == 0) {
        this.exists = false;
        this.visible = false;
    }
};

UIRubbleGroup.prototype.emit = function(tank) {
    if (QualityManager.getQuality() !== (QualityManager.QUALITY_SETTINGS.LOW || QualityManager.QUALITY_SETTINGS.MINIMUM)) {
        if (tank.getSpeed() != 0.0 || tank.getRotationSpeed() != 0.0) {
            this.exists = true;
            this.visible = true;

            var rubbleFragmentSprite = this.fragmentGroup.getFirstExists(false);
            if (rubbleFragmentSprite) {
                rubbleFragmentSprite.spawn(UIUtils.mpx(tank.getX()), UIUtils.mpx(tank.getY()), tank.getRotation(), tank.getSpeed());
            } else {
//            this.log.error("Could not create rubble fragment sprite. No sprite available.");
            }

            this.emitter.emit(UIUtils.mpx(tank.getX()), UIUtils.mpx(tank.getY()), tank.getRotation(), tank.getSpeed());
        }
    }
};

UIRubbleGroup.prototype.retire = function() {
    this.exists = false;
    this.visible = false;
    this.emitter.retire();
    this.fragmentGroup.callAll('retire');
};
