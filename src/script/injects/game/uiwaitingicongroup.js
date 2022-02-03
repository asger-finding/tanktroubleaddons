//FIXME See if this can be ported to Classy.
UIWaitingIconGroup = function(game)
{
    // Call super.
    Phaser.Group.call(this, game, null);
    
    this.waitingIcon = this.addChild(new Phaser.Sprite(this.game, 0, 0, 'waitingicon'));
    this.waitingIcon.anchor.setTo(0.5, 0.5);

    this.scale.setTo(UIConstants.ASSET_SCALE);

    this.headerText = this.addChild(new Phaser.Text(game, 0, UIConstants.WAITING_HEADER_Y, '', {font: UIConstants.WAITING_HEADER_FONT_SIZE+"px TankTrouble", fontWeight: "bold", fill: "#000000", stroke: "#ffffff", strokeThickness: UIConstants.WAITING_HEADER_STROKE_WIDTH}));
    this.headerText.anchor.setTo(0.5, 0.5);

    this.waitingText = this.addChild(new Phaser.Text(game, 0, UIConstants.WAITING_MESSAGE_Y, '', {font: UIConstants.WAITING_MESSAGE_FONT_SIZE+"px Arial", fontWeight: "bold", fill: "#000000", stroke: "#ffffff", strokeThickness: UIConstants.WAITING_MESSAGE_STROKE_WIDTH}));
    this.waitingText.anchor.setTo(0.0, 0.5);

    this.removeTween = null;

    this.message = "";

    this.numDots = 0;
    
    this.lastDotUpdateTime = 0;
    this.currentTime = 0;

    // Disable icon.
    this.exists = false;
    this.visible = false;

    // Create log.
    this.log = Log.create('UIWaitingIconGroup');
};

UIWaitingIconGroup.prototype = Object.create(Phaser.Group.prototype);
UIWaitingIconGroup.prototype.constructor = UIWaitingIconGroup;

UIWaitingIconGroup.prototype.update = function()
{
    if (!this.exists) {
        return;
    }

    this.currentTime += this.game.time.delta;
    if (this.currentTime > this.lastDotUpdateTime + UIConstants.WAITING_UPDATE_TIME) {
        this.numDots = (this.numDots + 1) % (UIConstants.WAITING_MAX_DOTS + 1);

        this.lastDotUpdateTime = this.currentTime;
    }
    
    let dotsString = "";
    for (let i = 0; i < this.numDots; ++i) {
        dotsString += ".";
    }

    this.waitingText.setText(this.message + " " + dotsString);
};

UIWaitingIconGroup.prototype.postUpdate = function() {
    if (!this.exists) {
        return;
    }

    // Call super.
    Phaser.Group.prototype.postUpdate.call(this);
};

UIWaitingIconGroup.prototype.spawn = function(x, y, showIcon, message, header, iconFrame)
{
    // Revive and place the group.
    this.x = x;
    this.y = y;
    this.exists = true;
    this.visible = true;

    if (header === undefined) {
        header = "";
    }
    if (iconFrame === undefined) {
        iconFrame = -1;
    }

    this.message = message;
    this.headerText.setText(header);

    if (iconFrame < 0) {
        this.waitingIcon.visible = showIcon;
        // Game mode icon is created lazily so we do not have to wait for it to load in boot state.
        if (this.gameModeIcon !== undefined) {
            this.gameModeIcon.visible = false;
        }
    } else {
        this.waitingIcon.visible = false;
        // Create game mode icon lazily so we do not have to wait for it to load in boot state.
        if (this.gameModeIcon === undefined) {
            this.gameModeIcon = this.addChild(new Phaser.Sprite(this.game, 0, 0, 'waitingmodeicon'));
            this.gameModeIcon.anchor.setTo(0.5, 0.5);
        }
        this.gameModeIcon.frame = iconFrame;
        this.gameModeIcon.visible = showIcon;
    }


    this.waitingText.setText(this.message);
    this.waitingText.x = -this.waitingText.width / 2.0;
};

UIWaitingIconGroup.prototype.refresh = function(message)
{
    this.message = message;
    
    this.waitingText.setText(this.message);
    this.waitingText.x = -this.waitingText.width / 2.0;
};

UIWaitingIconGroup.prototype.remove = function()
{
    this.exists = false;
    this.visible = false;
};

UIWaitingIconGroup.prototype.retire = function()
{
    this.exists = false;
    this.visible = false;
};
