//FIXME See if this can be ported to Classy.
UIConfettiParticle = function(game, x, y)
{
    // Call super.
    Phaser.Particle.call(this, game, x, y, 'celebration');

    // Setup animation.
    var randomConfettiIndex = Math.floor(Math.random() * 3);
    var prefix = 'confetti' + randomConfettiIndex + '-';
    this.animations.add('rotate', Phaser.Animation.generateFrameNames(prefix, 0, 4).concat(Phaser.Animation.generateFrameNames(prefix, 3, 1)), 24, true);
    this.animations.add('land', [prefix + 3], 24, false);

    this.tint = UIConstants.CONFETTI_COLORS[Math.floor(Math.random() * UIConstants.CONFETTI_COLORS.length)];

    this.frequency = UIConstants.CONFETTI_WOBBLE_MIN_FREQUENCY + Math.random() * (UIConstants.CONFETTI_WOBBLE_MAX_FREQUENCY - UIConstants.CONFETTI_WOBBLE_MIN_FREQUENCY);
    this.sample = Math.random() * Math.PI;

    // Kill particle.
    this.kill();
};

UIConfettiParticle.prototype = Object.create(Phaser.Particle.prototype);
UIConfettiParticle.prototype.constructor = UIConfettiParticle;

UIConfettiParticle.prototype.onEmit = function() {
    this.animations.play('rotate');
    this.animations.getAnimation('rotate').frame = Math.floor(Math.random() * this.animations.getAnimation('rotate').frameTotal);

    this.yOffset = Math.random() * UIConstants.CONFETTI_Y_VARIATION;

    this.x += this.body.velocity.x * (Math.random() + 2.0) / 15.0;
    this.y += this.body.velocity.y * (Math.random() + 2.0) / 15.0;
};

UIConfettiParticle.prototype.update = function() {
    this.sample += this.game.time.delta / 1000;

    if (this.body.velocity.y > UIConstants.CONFETTI_WOBBLE_KICK_IN_SPEED) {
        this.body.velocity.x += Math.cos(this.sample * this.frequency) * UIConstants.CONFETTI_WOBBLE_AMPLITUDE;
    }

    if (this.y > UIConstants.TROPHY_EXPLOSION_FLOOR_Y + this.yOffset) {
        this.animations.play('land');
        this.body.velocity.y = 0.0;
        this.body.angularVelocity = 0.0;
        this.body.rotation = 90;
        this.alpha = Math.max(0.0, this.alpha - 0.02);
    }
};

UIConfettiParticle.prototype.retire = function() {
    // Kill particle.
    this.kill();
};
