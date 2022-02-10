if (typeof require === 'function') {
    var Classy = require('./classy');
}

var TankState = Classy.newClass().name('TankState');

TankState.fields({
    data: {} // Store in an object for fast JSON serialization
});

TankState.constructor('withState', function(playerId, x, y, forward, back, rotation, left, right, fireDown, locked) {
    this.data.playerId = playerId;
    this.data.x = x;
    this.data.y = y;
    this.data.forward = forward;
    this.data.back = back;
    this.data.rotation = rotation;
    this.data.left = left;
    this.data.right = right;
    this.data.fireDown = fireDown;
    this.data.locked = locked;
});

TankState.constructor('withObject', function(obj) {
    this.data = obj;
});

TankState.methods({

    getPlayerId: function() {
        return this.data.playerId;
    },

    getX: function() {
        return this.data.x;
    },
    
    setX: function(x) {
        this.data.x = x;
    },

    getY: function() {
        return this.data.y;
    },
    
    setY: function(y) {
        this.data.y = y;
    },
    
    getForward: function() {
        return this.data.forward;
    },

    setForward: function(forward) {
        this.data.forward = forward;
    },

    getBack: function() {
        return this.data.back;
    },

    setBack: function(back) {
        this.data.back = back;
    },

    getRotation: function() {
        return this.data.rotation;
    },
    
    setRotation: function(rotation) {
        this.data.rotation = rotation;
    },
    
    getLeft: function() {
        return this.data.left;
    },
    
    setLeft: function(left) {
        this.data.left = left;
    },

    getRight: function() {
        return this.data.right;
    },

    setRight: function(right) {
        this.data.right = right;
    },

    getFireDown: function() {
        return this.data.fireDown;
    },
    
    setFireDown: function(fireDown) {
        this.data.fireDown = fireDown;
    },
    
    getLocked: function() {
        return this.data.locked;
    },
    
    setLocked: function(locked) {
        this.data.locked = locked;
    },
    
    toObj: function() {
        return this.data
    }
});

if (typeof module === 'object') {
    module.exports = TankState;
}
