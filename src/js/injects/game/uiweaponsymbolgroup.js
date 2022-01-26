//FIXME See if this can be ported to Classy.
UIWeaponSymbolGroup = function(game, gameController)
{
    // Call super.
    Phaser.Group.call(this, game, null);
    
    this.gameController = gameController;
    
    this.scale.set(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);
        
    // Create weapon icon group to hold all weapon icons.
    this.weaponIconGroup = this.game.add.group(this);

    // Add pool of weapon icons
    for (var i = 0; i < Constants.MAX_WEAPON_QUEUE + 1; ++i) {
        var weaponIcon = this.weaponIconGroup.add(new UIWeaponIconImage(game));
    }

    // State.
    this.theme = 0;
    this.weapons = null;
    this.weaponIcons = {};
    this.removeTimeout = null;


    // Disable symbol.
    this.exists = false;
    this.visible = false;

    // Create log.
    this.log = Log.create('UIWeaponSymbolGroup');
};

UIWeaponSymbolGroup.prototype = Object.create(Phaser.Group.prototype);
UIWeaponSymbolGroup.prototype.constructor = UIWeaponSymbolGroup;

UIWeaponSymbolGroup.prototype.setTheme = function(theme) {
    this.weaponIconGroup.callAll('setTheme', null, theme);
};

UIWeaponSymbolGroup.prototype.update = function()
{
    // Check if exists or game is frozen.
    if (!this.exists || this.game.physics.arcade.isPaused) {
        return;
    }

    var tank = this.gameController.getTank(this.playerId);
    if (tank) {
        this.x = UIUtils.mpx(tank.getX());
        this.y = UIUtils.mpx(tank.getY()) + Constants.TANK.HEIGHT.px * 1.3;
    }

    // Call super.
    Phaser.Group.prototype.update.call(this);
};

UIWeaponSymbolGroup.prototype.postUpdate = function() {
    if (!this.exists) {
        return;
    }

    // Call super.
    Phaser.Group.prototype.postUpdate.call(this);
};

UIWeaponSymbolGroup.prototype.spawn = function(playerId)
{
    var tank = this.gameController.getTank(playerId);
    if (tank)
    {
        if (this.removeTimeout) {
            clearTimeout(this.removeTimeout);
            this.removeTimeout = null;
        }

        // Revive and place the group.
        this.exists = true;
        this.visible = true;
        var position = {x: UIUtils.mpx(tank.getX()), y: UIUtils.mpx(tank.getY())};
        this.position.set(position.x, position.y + Constants.TANK.HEIGHT.px * 1.3);
    }
    
    // Store playerId.
    this.playerId = playerId;

    // Reset state.
    this.weapons = this.gameController.getQueuedWeapons(playerId);

    this._updateUI();
};

UIWeaponSymbolGroup.prototype.refresh = function() 
{
    var tank = this.gameController.getTank(this.playerId);
    if (tank)
    {
        // Update weapons stack.
        this.weapons = this.gameController.getQueuedWeapons(this.playerId);

        this._updateUI();
    }
};

UIWeaponSymbolGroup.prototype._updateUI = function()
{
    // Remove icons that should no longer show.
    for (var weaponIconId in this.weaponIcons) {
        var weaponIconStillNeeded = false;
        for (var i = 0; i < this.weapons.length; ++i) {
            if (weaponIconId == this.weapons[i].getId()) {
                weaponIconStillNeeded = true;
                break;
            }
        }
        
        if (!weaponIconStillNeeded) {
            this.weaponIcons[weaponIconId].remove();
            delete this.weaponIcons[weaponIconId];
        }
    }
    
    // Update existing icons and show new ones.
    var totalWidth = 0.0;
    // Compute total width of all icons.
    for (var i = this.weapons.length - 1; i >= 0; --i) {
        totalWidth += UIConstants.WEAPON_ICON_WIDTH * (UIConstants.WEAPON_ICON_MAX_SCALE - i * UIConstants.WEAPON_ICON_SCALE_STEP);
    }
    
    // Set scale and position to first icon.
    var scale = UIConstants.WEAPON_ICON_MAX_SCALE - (this.weapons.length - 1) * UIConstants.WEAPON_ICON_SCALE_STEP;
    var x = -totalWidth * 0.5 + 0.5 * scale * UIConstants.WEAPON_ICON_WIDTH;
    for (var i = 0; i < this.weapons.length; ++i) {
        
        if (this.weapons[i].getId() in this.weaponIcons) {
            //Update weapon icon sprite.
            this.weaponIcons[this.weapons[i].getId()].refresh(x, scale);
        } else {
            var weaponIcon = this.weaponIconGroup.getFirstExists(false);
            if (weaponIcon) {
                this.weaponIcons[this.weapons[i].getId()] = weaponIcon;
                weaponIcon.spawn(x, 0, scale, this.weapons[i].getType());
            } else {
                this.log.error("Could not create weapon icon sprite. No sprite available.");
            }
        }
        
        // Update scale and position to next icon.
        x += 0.5 * scale * UIConstants.WEAPON_ICON_WIDTH;
        scale += UIConstants.WEAPON_ICON_SCALE_STEP;
        x += 0.5 * scale * UIConstants.WEAPON_ICON_WIDTH;
    }
};

UIWeaponSymbolGroup.prototype.remove = function()
{
    this.exists = false;

    var self = this;
    this.removeTimeout = setTimeout(function() {
        self.visible = false;
    }, UIConstants.ELEMENT_GLIDE_OUT_TIME);

    // Remove all weapon icons.
    this.weaponIconGroup.callAll('remove');
};

UIWeaponSymbolGroup.prototype.retire = function()
{
    this.exists = false;
    this.visible = false;
    this.weaponIconGroup.callAll('retire');
};
