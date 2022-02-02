//FIXME See if this can be ported to Classy.
UIStreamerGraphics = function(game)
{
    // Call super.
    Phaser.Graphics.call(this, game, 0, 0);

    this.colour = 0x00ff00;

    this.front = this.addChild(new Phaser.Sprite(game, 0, 0));
    this.front.anchor.setTo(0.5, 0.5);

    // Set up UI Physics body.
    this.game.physics.arcade.enable(this.front);
    this.front.body.checkCollision.none = true;
    this.front.body.gravity.y = UIConstants.PLAYER_PANEL_GRAVITY;

    // State.
    this.streamerPositions = [];
    this.timeAlive = 0.0;

    // Disable streamers.
    this.kill();
};

UIStreamerGraphics.prototype = Object.create(Phaser.Graphics.prototype);
UIStreamerGraphics.prototype.constructor = UIStreamerGraphics;

UIStreamerGraphics.prototype.update = function()
{
    // Check if exists.
    if (!this.exists) {
        return;
    }

    this.timeAlive += this.game.time.delta / 1000;

    // Add next position.
    var nextX = this.front.x;
    var nextY = this.front.y;
    var xDiff = this.streamerPositions[this.streamerPositions.length-1].x - nextX;
    var yDiff = this.streamerPositions[this.streamerPositions.length-1].y - nextY;
    var length = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
    this.streamerPositions.push({x: nextX, y: nextY, length: length});

    // Draw graphics.
    this.clear();

    this.lineStyle(UIConstants.STREAMER_WIDTH, this.colour, 1.0);

    var lengthSum = 0.0;
    if (this.streamerPositions.length >= 2) {
        var i = this.streamerPositions.length - 1;
        this.moveTo(this.streamerPositions[i].x + Math.sin(lengthSum * UIConstants.STREAMER_FREQUENCY) * UIConstants.STREAMER_AMPLITUDE_X, this.streamerPositions[i].y + Math.cos(lengthSum * UIConstants.STREAMER_FREQUENCY) * UIConstants.STREAMER_AMPLITUDE_Y);
        lengthSum += this.streamerPositions[i].length;
        for (; i >= 0; --i) {
            this.lineTo(this.streamerPositions[i].x + Math.sin(lengthSum * UIConstants.STREAMER_FREQUENCY) * UIConstants.STREAMER_AMPLITUDE_X, this.streamerPositions[i].y + Math.cos(lengthSum * UIConstants.STREAMER_FREQUENCY) * UIConstants.STREAMER_AMPLITUDE_Y);
            lengthSum += this.streamerPositions[i].length;
        }
    }
};

UIStreamerGraphics.prototype.spawn = function(x, y, colour)
{
    // Revive the graphics.
    this.revive();

    // Clear graphics.
    this.clear();

    this.front.reset(x, y);
    var speed = UIConstants.STREAMER_MIN_SPEED + Math.random() * (UIConstants.STREAMER_MAX_SPEED - UIConstants.STREAMER_MIN_SPEED);
    var direction = UIConstants.STREAMER_MIN_ANGLE + Math.random() * (UIConstants.STREAMER_MAX_ANGLE - UIConstants.STREAMER_MIN_ANGLE);
    var speedX = Math.cos(direction) * speed;
    var speedY = Math.sin(direction) * speed;

    this.front.body.rotation = Math.random() * Math.PI * 2.0;
    this.front.body.velocity.x = speedX;
    this.front.body.velocity.y = speedY;

    // Store colour.
    this.colour = colour;

    // Reset state.
    this.streamerPositions = [];
    this.streamerPositions.push({x: x, y: y, length: 0.0});
    this.timeAlive = 0.0;
};


UIStreamerGraphics.prototype.remove = function()
{
    // Kill the sprite.
    this.front.kill();
};

UIStreamerGraphics.prototype.retire = function()
{
    // Kill the sprite.
    this.front.kill();
    // Kill the graphics.
    this.kill();
};
