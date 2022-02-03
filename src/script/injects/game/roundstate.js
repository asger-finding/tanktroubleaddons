if (typeof require === 'function') {
    var Classy = require('./classy');
    var TankState = require('./tankstate');
    var ProjectileState = require('./projectilestate');
    var CollectibleState = require('./collectiblestate');
    var WeaponState = require('./weaponstate');
    var UpgradeState = require('./upgradestate');
    var CounterState = require('./counterstate');
    var ZoneState = require('./zonestate');
}

RoundState = Classy.newClass().name('RoundState');

RoundState.constructor(function() {
});

RoundState.constructor('withState', function(tankStates, projectileStates, collectibleStates, weaponStates, upgradeStates, counterStates, zoneStates) {
    this.data.tankStates = tankStates;
    this.data.projectileStates = projectileStates;
    this.data.collectibleStates = collectibleStates;
    this.data.weaponStates = weaponStates;
    this.data.upgradeStates = upgradeStates;
    this.data.counterStates = counterStates;
    this.data.zoneStates = zoneStates;
});

RoundState.constructor('withObject', function(obj) {
    this.data = obj;
});

RoundState.fields({
    data: {
        tankStates: [],
        projectileStates: [],
        collectibleStates: [],
        weaponStates: [],
        upgradeStates: [],
        counterStates: [],
        zoneStates: []
    },

    // Cached states to speed up multiple get calls.
    cachedTankStates: null,
    cachedProjectileStates: null,
    cachedCollectibleStates: null,
    cachedWeaponStates: null,
    cachedUpgradeStates: null,
    cachedCounterStates: null,
    cachedZoneStates: null
});

RoundState.methods({

    getTankStates: function() {
        if (this.cachedTankStates) {
            return this.cachedTankStates;
        }

        var tankStates = [];
        for (let i = 0; i < this.data.tankStates.length; ++i) {
            tankStates.push(TankState.withObject(this.data.tankStates[i]));
        }

        this.cachedTankStates = tankStates;

        return tankStates;
    },

    setTankStates: function(tankStates) {
        this.cachedTankStates = tankStates;

        this.data.tankStates = [];
        for (let i = 0; i < tankStates.length; ++i) {
            this.data.tankStates.push(tankStates[i].toObj());
        }
    },

    getProjectileStates: function() {
        if (this.cachedProjectileStates) {
            return this.cachedProjectileStates;
        }

        var projectileStates = [];
        for (let i = 0; i < this.data.projectileStates.length; ++i) {
            projectileStates.push(ProjectileState.withObject(this.data.projectileStates[i]));
        }

        this.projectileStates = projectileStates;

        return projectileStates;
    },

    setProjectileStates: function(projectileStates) {
        this.cachedProjectileStates = projectileStates;

        this.data.projectileStates = [];
        for (let i = 0; i < projectileStates.length; ++i) {
            this.data.projectileStates.push(projectileStates[i].toObj());
        }
    },
    
    getCollectibleStates: function() {
        if (this.cachedCollectibleStates) {
            return this.cachedCollectibleStates;
        }

        var collectibleStates = [];
        for (let i = 0; i < this.data.collectibleStates.length; ++i) {
            collectibleStates.push(CollectibleState.withObject(this.data.collectibleStates[i]));
        }

        this.cachedCollectibleStates = collectibleStates;

        return collectibleStates;
        
    },
    
    setCollectibleStates: function(collectibleStates) {
        this.cachedCollectibleStates = collectibleStates;

        this.data.collectibleStates = [];
        for (let i = 0; i < collectibleStates.length; ++i) {
            this.data.collectibleStates.push(collectibleStates[i].toObj());
        }
    },
    
    getWeaponStates: function() {
        if (this.cachedWeaponStates) {
            return this.cachedWeaponStates;
        }

        var weaponStates = [];
        for (let i = 0; i < this.data.weaponStates.length; ++i) {
            weaponStates.push(WeaponState.withObject(this.data.weaponStates[i]));
        }

        this.cachedWeaponStates = weaponStates;

        return weaponStates;
    },
    
    setWeaponStates: function(weaponStates) {
        this.cachedWeaponStates = weaponStates;

        this.data.weaponStates = [];
        for (let i = 0; i < weaponStates.length; ++i) {
            this.data.weaponStates.push(weaponStates[i].toObj());
        }
    },

    getUpgradeStates: function() {
        if (this.cachedUpgradeStates) {
            return this.cachedUpgradeStates;
        }

        var upgradeStates = [];
        for (let i = 0; i < this.data.upgradeStates.length; ++i) {
            upgradeStates.push(UpgradeState.withObject(this.data.upgradeStates[i]));
        }

        this.cachedUpgradeStates = upgradeStates;

        return upgradeStates;
    },

    setUpgradeStates: function(upgradeStates) {
        this.cachedUpgradeStates = upgradeStates;

        this.data.upgradeStates = [];
        for (let i = 0; i < upgradeStates.length; ++i) {
            this.data.upgradeStates.push(upgradeStates[i].toObj());
        }
    },

    getCounterStates: function() {
        if (this.cachedCounterStates) {
            return this.cachedCounterStates;
        }

        var counterStates = [];
        for (let i = 0; i < this.data.counterStates.length; ++i) {
            counterStates.push(CounterState.withObject(this.data.counterStates[i]));
        }

        this.cachedCounterStates = counterStates;

        return counterStates;
    },

    setCounterStates: function(counterStates) {
        this.cachedCounterStates = counterStates;

        this.data.counterStates = [];
        for (let i = 0; i < counterStates.length; ++i) {
            this.data.counterStates.push(counterStates[i].toObj());
        }
    },

    getZoneStates: function() {
        if (this.cachedZoneStates) {
            return this.cachedZoneStates;
        }

        var zoneStates = [];
        for (let i = 0; i < this.data.zoneStates.length; ++i) {
            zoneStates.push(ZoneState.withObject(this.data.zoneStates[i]));
        }

        this.cachedZoneStates = zoneStates;

        return zoneStates;
    },

    setZoneStates: function(zoneStates) {
        this.cachedZoneStates = zoneStates;

        this.data.zoneStates = [];
        for (let i = 0; i < zoneStates.length; ++i) {
            this.data.zoneStates.push(zoneStates[i].toObj());
        }
    },

    isExpanded: function() {
        return this.data.weaponStates.length > 0 || this.data.upgradeStates.length > 0 || this.data.counterStates.length > 0 || this.data.zoneStates.length > 0;
    },

    toObj: function() {
        return this.data;
    }
    
});

if (typeof module === 'object') {
    module.exports = RoundState;
}
