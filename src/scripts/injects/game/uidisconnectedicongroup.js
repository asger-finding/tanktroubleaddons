//FIXME See if this can be ported to Classy.
UIDisconnectedIconGroup = function(game)
{
    // Call super.
    Phaser.Group.call(this, game, null);
    
    this.disconnectedIcon = this.addChild(new Phaser.Sprite(this.game, 0, 0, 'disconnectedicon'));
    this.disconnectedIcon.anchor.setTo(0.5, 0.5);

    this.scale.setTo(UIConstants.ASSET_SCALE);

    this.headerText = this.addChild(new Phaser.Text(game, 0, UIConstants.DISCONNECTED_HEADER_Y, 'Connecting', {font: UIConstants.DISCONNECTED_HEADER_FONT_SIZE+"px TankTrouble", fontWeight: "bold", fill: "#000000", stroke: "#ffffff", strokeThickness: UIConstants.DISCONNECTED_HEADER_STROKE_WIDTH}));
    this.headerText.anchor.setTo(0.5, 0.5);

    this.waitingText = this.addChild(new Phaser.Text(game, 0, UIConstants.DISCONNECTED_MESSAGE_Y, '', {font: UIConstants.DISCONNECTED_MESSAGE_FONT_SIZE+"px Arial", fontWeight: "bold", fill: "#000000", stroke: "#ffffff", strokeThickness: UIConstants.DISCONNECTED_MESSAGE_STROKE_WIDTH}));
    this.waitingText.anchor.setTo(0.0, 0.5);

    this.removeTween = null;

    this.message = "";

    this.numDots = 0;
    
    this.lastDotUpdateTime = 0;
    this.lastMessageUpdateTime = 0;
    this.currentTime = 0;

    // Disable icon.
    this.exists = false;
    this.visible = false;

    // Create log.
    this.log = Log.create('UIDisconnectedIconGroup');
};

UIDisconnectedIconGroup.prototype = Object.create(Phaser.Group.prototype);
UIDisconnectedIconGroup.prototype.constructor = UIDisconnectedIconGroup;

UIDisconnectedIconGroup.prototype.update = function()
{
    if (!this.exists) {
        return;
    }

    this.currentTime += this.game.time.delta;
    if (this.currentTime > this.lastDotUpdateTime + UIConstants.WAITING_UPDATE_TIME) {
        this.numDots = (this.numDots + 1) % (UIConstants.WAITING_MAX_DOTS + 1);

        this.lastDotUpdateTime = this.currentTime;
    }

    if (this.currentTime > this.lastMessageUpdateTime + UIConstants.DISCONNECTED_MESSAGE_UPDATE_TIME) {
        this._updateMessage();
    }
    
    let dotsString = "";
    for (let i = 0; i < this.numDots; ++i) {
        dotsString += ".";
    }

    this.waitingText.setText(this.message + " " + dotsString);
};

UIDisconnectedIconGroup.prototype.postUpdate = function() {
    if (!this.exists) {
        return;
    }

    // Call super.
    Phaser.Group.prototype.postUpdate.call(this);
};

UIDisconnectedIconGroup.prototype.spawn = function(x, y, delay)
{
    if (this.spawnEvent) {
        this.game.time.events.remove(this.spawnEvent);
        this.spawnEvent = false;
    }

    const self = this;
    this.spawnEvent = this.game.time.events.add(delay, function() {
        // Revive and place the group.
        self.x = x;
        self.y = y;
        self.exists = true;
        self.visible = true;

        self._updateMessage();
    });
};

UIDisconnectedIconGroup.prototype.remove = function()
{
    if (this.spawnEvent) {
        this.game.time.events.remove(this.spawnEvent);
        this.spawnEvent = false;
    }

    this.exists = false;
    this.visible = false;
};

UIDisconnectedIconGroup.prototype.retire = function()
{
    if (this.spawnEvent) {
        this.game.time.events.remove(this.spawnEvent);
        this.spawnEvent = false;
    }

    this.exists = false;
    this.visible = false;
};

UIDisconnectedIconGroup.prototype._updateMessage = function()
{
    this.message = MathUtils.randomArrayEntry(UIConstants.CONNECTING_MESSAGES);

    this.waitingText.setText(this.message);
    this.waitingText.x = -this.waitingText.width / 2.0;

    this.lastMessageUpdateTime = this.currentTime;
};
