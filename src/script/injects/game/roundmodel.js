if (typeof require === 'function') {
    var Classy = require('./classy');
    var Log = require('./log');
    //var IdGenerator = require('./idgenerator');
    var B2DUtils = require('./b2dutils');
    var Constants = require('./constants');
    var Tank = require('./tank');
    var BulletWeapon = require('./bulletweapon');
    var LaserWeapon = require('./laserweapon');
    var DoubleBarrelWeapon = require('./doublebarrelweapon');
    var ShotgunWeapon = require('./shotgunweapon');
    var HomingMissileWeapon = require('./homingmissileweapon');
    var Projectile = require('./projectile');
    var Shotgun = require('./shotgun');
    var HomingMissile = require('./homingmissile');
    var Collectible = require('./collectible');
    var LaserAimerUpgrade = require('./laseraimerupgrade');
    var SpawnShieldUpgrade = require('./spawnshieldupgrade');
    var AimerUpgrade = require('./aimerupgrade');
    var ShieldUpgrade = require('./shieldupgrade');
    var SpeedBoostUpgrade = require('./speedboostupgrade');
    var TimerCountdownCounter = require('./timercountdowncounter');
    var OvertimeCountUpCounter = require('./overtimecountupcounter');
    var SpawnZone = require('./spawnzone');
    var RoundState = require('./roundstate');
    var ChickenOut = require('./chickenout');
}


var RoundModel = Classy.newClass();


/*
 * Events:
 * - updated()
 *
 * Datastructures:
 *
 * ProjectileState:
 *
 * {
 *      id: <string>
 *      playerId: <string>,
 *      type: <int>,
 *      x: <float>,
 *      y: <float>,
 *      speedX: <float>,
 *      speedY: <float>,
 * }
 *
 * CollectibleState:
 *
 * {
 *      id: <string>,
 *      type: <int>,
 *      x: <float>,
 *      y: <float>,
 *      rotation: <float>
 * }
 *
 * WeaponState:
 *
 * {
 *      id: <string>,
 *      playerId: <string>,
 *      type: <int>,
 *      fieldsJSON: <string>
 * }
 *
 * UpgradeState:
 *
 * {
 *      id: <string>,
 *      playerId: <string>,
 *      type: <int>,
 *      fieldsJSON: <string>
 * }
 *
 *  CounterState:
 *
 * {
 *      id: <string>,
 *      type: <int>,
 *      fieldsJSON: <string>
 * }
 *
 *  ZoneState:
 *
 * {
 *      id: <string>,
 *      type: <int>,
 *      tiles: [<int>, <int>],
 *      fieldsJSON: <string>
 * }
 *
 * TankState:
 * {
 *      playerId: <string>,
 *      x: <float>,
 *      y: <float>,
 *      forward: <bool>,
 *      back: <bool>,
 *      rotation: <float>,
 *      left: <bool>,
 *      right: <bool>
 * }
 *
 */

RoundModel.fields({
    b2dworld: null,
    tanks: {},
    projectiles: {},
    collectibles: {},
    collectibleCounts: {}, // Map from collectible type to count.
    weapons: {},
    upgrades: {},
    counters: {},
    zones: {},
    weaponCreated: false,
    upgradeCreated: false,
    counterCreated: false,
    zoneCreated: false,
    //zoneChanged: false,
    eventListeners: [],
    collisionEvents: [],
    destroyedPlayerIds: [],
    destroyedProjectileIds: [],
    destroyedCollectibleIds: [],
    destroyedZoneIds: [],
    playerIdOtherWeaponIds: {}, // Map from player id to array of weapon ids (minus default weapon).
    playerIdDefaultWeaponId: {}, // Map from player id to default weapon id.
    playerIdUpgradeIds: {}, // Map from player id to array of upgrade ids.
    playerIdModifiers: {}, // Map from player id to list of modifiers. List is guaranteed to contain an entry for each modifier type.
    started: false,
    running: true,
    goldSpawnCount: 0,
    diamondSpawnCount: 0,
    ranked: false,
    victoryGoldAmount: 0,
    stakes: [],
    punishablePlayerIds: [],
    cachedRoundState: null,
    log: null,
    maze: null
});


RoundModel.constructor(function(controllerId, b2dworld) {
    this.log = Log.create('RoundModel' + controllerId);
    this.b2dworld = b2dworld;
    this.b2dworld.SetContactListener(this);
    for (const collectibleType in Constants.COLLECTIBLE_TYPES) {
        this.collectibleCounts[Constants.COLLECTIBLE_TYPES[collectibleType]] = 0;
    }
});

RoundModel.methods({

    /**
     * Implemented to be a b2d contact listener
     */
    BeginContact: function(b2dcontact) {
        // Intentionally left blank
    },

    /**
     * Implemented to be a b2d contact listener
     */
    EndContact: function(b2dcontact) {
        // Intentionally left blank
    },

    /**
     * Implemented to be a b2d contact listener
     */
    PostSolve: function(b2dcontact, b2dcontactimpulse) {
        // Intentionally left blank
    },

    /**
     * Implemented to be a b2d contact listener
     */
    PreSolve: function(b2dcontact, b2dmanifold) {
        // Ignore contacts that are not touching.
        if (!b2dcontact.IsTouching()) {
            return;
        }
        
        const data = B2DUtils.getContactData(b2dcontact);

        // Collect collision event for later dispatch, AFTER the entire physics step has been completed.
        const collisionEvent = {};
        
        switch(data.contactBits)
        {
            case Constants.COLLISION_CATEGORIES.MAZE | Constants.COLLISION_CATEGORIES.PROJECTILE:
            {
                if (!data.projectile.isDeadlyToOwner()) {
                    data.projectile.makeDeadlyToOwner();
                }
                collisionEvent.collisionType = RoundModel._EVENTS.PROJECTILE_MAZE_COLLISION;
                collisionEvent.data = data;
                break;
            }
            case Constants.COLLISION_CATEGORIES.TANK | Constants.COLLISION_CATEGORIES.PROJECTILE:
            {
                if (data.projectile.isDeadlyToOwner() || data.tankA.getPlayerId() != data.projectile.getPlayerId()) {
                    collisionEvent.collisionType = RoundModel._EVENTS.TANK_DEADLY_COLLISION;
                    collisionEvent.data = data;
                }
                b2dcontact.SetEnabled(false);
                break;
            }
            case Constants.COLLISION_CATEGORIES.SHIELD | Constants.COLLISION_CATEGORIES.PROJECTILE:
            {
                if (!data.projectile.isDeadlyToOwner() && data.projectile.getPlayerId() == data.shieldA.getPlayerId()) {
                    b2dcontact.SetEnabled(false);
                } else {
                    if (!data.projectile.isDeadlyToOwner()) {
                        data.projectile.makeDeadlyToOwner();
                    }
                    collisionEvent.collisionType = RoundModel._EVENTS.PROJECTILE_SHIELD_COLLISION;
                    collisionEvent.data = data;
                }

                break;
            }
            case Constants.COLLISION_CATEGORIES.ZONE | Constants.COLLISION_CATEGORIES.PROJECTILE:
            {
                if (!data.zone.isPhysical()) {
                    b2dcontact.SetEnabled(false);
                }
                collisionEvent.collisionType = RoundModel._EVENTS.PROJECTILE_ZONE_COLLISION;
                collisionEvent.data = data;
                break;
            }
            case Constants.COLLISION_CATEGORIES.TANK:
            {
                collisionEvent.collisionType = RoundModel._EVENTS.TANK_TANK_COLLISION;
                collisionEvent.data = data;
                break;
            }
            case Constants.COLLISION_CATEGORIES.MAZE | Constants.COLLISION_CATEGORIES.TANK:
            {
                collisionEvent.collisionType = RoundModel._EVENTS.TANK_MAZE_COLLISION;
                collisionEvent.data = data;
                break;
            }
            case Constants.COLLISION_CATEGORIES.COLLECTIBLE | Constants.COLLISION_CATEGORIES.TANK:
            {
                collisionEvent.collisionType = RoundModel._EVENTS.TANK_COLLECTIBLE_COLLISION;
                collisionEvent.data = data;
                b2dcontact.SetEnabled(false);
                break;
            }
            case Constants.COLLISION_CATEGORIES.SHIELD | Constants.COLLISION_CATEGORIES.TANK:
            {
                if (data.tankA.getPlayerId() == data.shieldA.getPlayerId()) {
                    b2dcontact.SetEnabled(false);
                } else {
                    collisionEvent.collisionType = RoundModel._EVENTS.TANK_SHIELD_COLLISION;
                    collisionEvent.data = data;
                }
                break;
            }
            case Constants.COLLISION_CATEGORIES.ZONE | Constants.COLLISION_CATEGORIES.TANK:
            {
                if (!data.zone.isPhysical()) {
                    b2dcontact.SetEnabled(false);
                }
                collisionEvent.collisionType = RoundModel._EVENTS.TANK_ZONE_COLLISION;
                collisionEvent.data = data;
                break;
            }
            case Constants.COLLISION_CATEGORIES.SHIELD:
            {
                collisionEvent.collisionType = RoundModel._EVENTS.SHIELD_SHIELD_COLLISION;
                collisionEvent.data = data;
                break;
            }
            case Constants.COLLISION_CATEGORIES.SHIELD | Constants.COLLISION_CATEGORIES.ZONE:
            {
                if (!data.zone.isPhysical()) {
                    b2dcontact.SetEnabled(false);
                }
                collisionEvent.collisionType = RoundModel._EVENTS.SHIELD_ZONE_COLLISION;
                collisionEvent.data = data;
                break;
            }
        }
        
        // Check that the collision was handled.
        if (collisionEvent.data !== undefined) {
            this.collisionEvents.push(collisionEvent);
        }
    },

    setMaze: function(maze) {
        this.maze = maze;
        B2DUtils.createMaze(this.b2dworld, maze);
        this._notifyEventListeners(RoundModel._EVENTS.MAZE_SET, maze);
    },

    getMaze: function() {
        return this.maze;
    },

    removeTank: function(playerId) {
        if (playerId in this.tanks) {
            // Invalidate cached round state.
            this.cachedRoundState = null;

            this.destroyedPlayerIds.push(playerId);

            this.punishablePlayerIds.push(playerId);

            const projectileIds = [];

            // Find all the projectiles of this tank and remove them, too.
            for (const projectile in this.projectiles) {
                if (this.projectiles[projectile].getPlayerId() == playerId) {
                    const projectileId = this.projectiles[projectile].getId();
                    this.destroyedProjectileIds.push(projectileId);
                    projectileIds.push(projectileId);
                }
            }

            const chickenOut = ChickenOut.create(playerId, projectileIds);
            this._notifyEventListeners(RoundModel._EVENTS.TANK_CHICKENED_OUT, chickenOut);
        } else {
            this.log.error("Attempt to remove tank with id " + playerId + " from round, but tank is not currently in this round");
        }
    },

    setProjectileState: function(projectileState) {
        // Invalidate cached round state.
        this.cachedRoundState = null;

        if (!(projectileState.getId() in this.projectiles)) {

            let projectile;
            let b2dBody;
            switch(projectileState.getType()) {
                case Constants.WEAPON_TYPES.BULLET:
                {
                    projectile = Projectile.create(projectileState, Constants.BULLET_MAX_LIFETIME, Constants.PROJECTILE_BOUNCE_TIMEOUT_WINDOW, Constants.PROJECTILE_BOUNCE_TIMEOUT_COUNT, this, this.relayEvent, this);
                    b2dBody = B2DUtils.createProjectileBody(this.b2dworld, projectile, Constants.BULLET.RADIUS.m);

                    break;
                }
                case Constants.WEAPON_TYPES.LASER:
                {
                    projectile = Projectile.create(projectileState, Constants.LASER_MAX_LIFETIME, Constants.PROJECTILE_BOUNCE_TIMEOUT_WINDOW, Constants.PROJECTILE_BOUNCE_TIMEOUT_COUNT, this, this.relayEvent, this);
                    b2dBody = B2DUtils.createProjectileBody(this.b2dworld, projectile, Constants.LASER.RADIUS.m);

                    break;
                }
                case Constants.WEAPON_TYPES.DOUBLE_BARREL:
                {
                    projectile = Projectile.create(projectileState, Constants.DOUBLE_BARREL_MAX_LIFETIME, Constants.PROJECTILE_BOUNCE_TIMEOUT_WINDOW, Constants.PROJECTILE_BOUNCE_TIMEOUT_COUNT, this, this.relayEvent, this);
                    b2dBody = B2DUtils.createProjectileBody(this.b2dworld, projectile, Constants.DOUBLE_BARREL.RADIUS.m);

                    break;
                }
                case Constants.WEAPON_TYPES.SHOTGUN:
                {
                    projectile = Shotgun.create(projectileState, Constants.SHOTGUN_MAX_LIFETIME, Constants.PROJECTILE_BOUNCE_TIMEOUT_WINDOW, Constants.PROJECTILE_BOUNCE_TIMEOUT_COUNT, this, this.relayEvent, this);
                    b2dBody = B2DUtils.createProjectileBody(this.b2dworld, projectile, Constants.SHOTGUN.RADIUS.m);

                    break;
                }
                case Constants.WEAPON_TYPES.HOMING_MISSILE:
                {
                    projectile = HomingMissile.create(projectileState, Constants.HOMING_MISSILE_MAX_LIFETIME, Constants.PROJECTILE_BOUNCE_TIMEOUT_WINDOW, Constants.PROJECTILE_BOUNCE_TIMEOUT_COUNT, this, this.relayEvent, this);
                    b2dBody = B2DUtils.createProjectileBody(this.b2dworld, projectile, Constants.HOMING_MISSILE.RADIUS.m);

                    break;
                }
            }

            projectile.setB2DBody(b2dBody);

            this.projectiles[projectileState.getId()] = projectile;
            this._notifyEventListeners(RoundModel._EVENTS.PROJECTILE_CREATED, projectile);
        } else {
            this.projectiles[projectileState.getId()].setProjectileState(projectileState);
        }
    },

    setCollectibleState: function(collectibleState) {
        // Invalidate cached round state.
        this.cachedRoundState = null;

        if (!(collectibleState.getId() in this.collectibles)) {

            const collectible = Collectible.create(collectibleState);
            let b2dBody;
            switch (collectibleState.getType()) {
                case Constants.COLLECTIBLE_TYPES.CRATE_LASER:
                case Constants.COLLECTIBLE_TYPES.CRATE_DOUBLE_BARREL:
                case Constants.COLLECTIBLE_TYPES.CRATE_SHOTGUN:
                case Constants.COLLECTIBLE_TYPES.CRATE_HOMING_MISSILE:
                case Constants.COLLECTIBLE_TYPES.CRATE_AIMER:
                case Constants.COLLECTIBLE_TYPES.CRATE_SHIELD:
                case Constants.COLLECTIBLE_TYPES.CRATE_SPEED_BOOST:
                {
                    b2dBody = B2DUtils.createCrateBody(this.b2dworld, collectible);

                    break;
                }
                case Constants.COLLECTIBLE_TYPES.GOLD:
                {
                    b2dBody = B2DUtils.createGoldBody(this.b2dworld, collectible);
                    ++this.goldSpawnCount;

                    break;
                }
                case Constants.COLLECTIBLE_TYPES.DIAMOND:
                {
                    b2dBody = B2DUtils.createDiamondBody(this.b2dworld, collectible);
                    ++this.diamondSpawnCount;

                    break;
                }
            }

            collectible.setB2DBody(b2dBody);

            this.collectibles[collectibleState.getId()] = collectible;
            this.collectibleCounts[collectible.getType()]++;
            this._notifyEventListeners(RoundModel._EVENTS.COLLECTIBLE_CREATED, collectible);
        } else {
            this.collectibles[collectibleState.getId()].setCollectibleState(collectibleState);
        }
    },

    setTankState: function(tankState) {
        // Invalidate cached round state.
        this.cachedRoundState = null;

        if (!(tankState.getPlayerId() in this.tanks)) {
            const tank = Tank.create(tankState, this);
            this.tanks[tankState.getPlayerId()] = tank;
            this.playerIdDefaultWeaponId[tankState.getPlayerId()] = null;
            this.playerIdOtherWeaponIds[tankState.getPlayerId()] = [];
            this.playerIdUpgradeIds[tankState.getPlayerId()] = [];
            this._updateModifiers(tankState.getPlayerId()); // Update map from tank to modifiers.
            const b2dBody = B2DUtils.createTankBody(this.b2dworld, tank);
            tank.setB2DBody(b2dBody);
            this._notifyEventListeners(RoundModel._EVENTS.TANK_CREATED, tank);
        } else {
            this.tanks[tankState.getPlayerId()].setTankState(tankState);
        }
    },
    
    setWeaponState: function(weaponState) {
        // Invalidate cached round state.
        this.cachedRoundState = null;

        if (!(weaponState.getId() in this.weapons)) {
            let weapon;
            switch(weaponState.getType()) {
                case Constants.WEAPON_TYPES.BULLET:
                {
                    weapon = BulletWeapon.create(weaponState, this, this.relayEvent, this);
                    break;
                }
                case Constants.WEAPON_TYPES.LASER:
                {
                    weapon = LaserWeapon.create(weaponState, this, this.relayEvent, this);
                    break;
                }
                case Constants.WEAPON_TYPES.DOUBLE_BARREL:
                {
                    weapon = DoubleBarrelWeapon.create(weaponState, this, this.relayEvent, this);
                    break;
                }
                case Constants.WEAPON_TYPES.SHOTGUN:
                {
                    weapon = ShotgunWeapon.create(weaponState, this, this.relayEvent, this);
                    break;
                }
                case Constants.WEAPON_TYPES.HOMING_MISSILE:
                {
                    weapon = HomingMissileWeapon.create(weaponState, this, this.relayEvent, this);
                    break;
                }
            }
            
            this.weapons[weaponState.getId()] = weapon;

            // Update map from tank to weapons.
            if (weapon.isDefault()) {
                this.playerIdDefaultWeaponId[weaponState.getPlayerId()] = weapon.getId();
            } else {
                this.playerIdOtherWeaponIds[weaponState.getPlayerId()].unshift(weapon.getId());
            }

            // Update tank's body.
            const newWeapon = this.getActiveWeapon(weaponState.getPlayerId());
            const tank = this.tanks[weaponState.getPlayerId()];
            if (newWeapon && tank) {
                B2DUtils.updateTankBodyTurret(tank.getB2DBody(), tank, newWeapon);
            }

            this.weaponCreated = true;
            this._notifyEventListeners(RoundModel._EVENTS.WEAPON_CREATED, weapon);
        } else {
            // Intentionally do not synch existing weapons.
            //this.weapons[weaponState.getId()].setWeaponState(weaponState);
        }
    },

    setUpgradeState: function(upgradeState) {
        // Invalidate cached round state.
        this.cachedRoundState = null;

        if (!(upgradeState.getId() in this.upgrades)) {

            let upgrade;
            switch (upgradeState.getType()) {
                case Constants.UPGRADE_TYPES.LASER_AIMER:
                {
                    upgrade = LaserAimerUpgrade.create(upgradeState, this, this.relayEvent, this);
                    break;
                }
                case Constants.UPGRADE_TYPES.SPAWN_SHIELD:
                {
                    upgrade = SpawnShieldUpgrade.create(upgradeState, this, this.relayEvent, this);
                    break;
                }
                case Constants.UPGRADE_TYPES.AIMER:
                {
                    upgrade = AimerUpgrade.create(upgradeState, this, this.relayEvent, this);
                    break;
                }
                case Constants.UPGRADE_TYPES.SHIELD:
                {
                    upgrade = ShieldUpgrade.create(upgradeState, this, this.relayEvent, this);
                    break;
                }
                case Constants.UPGRADE_TYPES.SPEED_BOOST:
                {
                    upgrade = SpeedBoostUpgrade.create(upgradeState, this, this.relayEvent, this);
                    break;
                }
            }

            this.upgrades[upgradeState.getId()] = upgrade;

            // Update map from tank to upgrades.
            this.playerIdUpgradeIds[upgradeState.getPlayerId()].push(upgrade.getId());

            // Update map from tank to modifiers.
            this._updateModifiers(upgradeState.getPlayerId());

            // Update tank's body.
            const tank = this.tanks[upgradeState.getPlayerId()];
            if (tank) {
                B2DUtils.addTankBodyUpgrade(tank.getB2DBody(), upgrade);
            }

            this.upgradeCreated = true;
            this._notifyEventListeners(RoundModel._EVENTS.UPGRADE_CREATED, upgrade);
        } else {
            // Intentionally do not synch existing upgrades.
            //this.upgrades[upgradeState.getId()].setUpgradeState(upgradeState);
        }
    },

    setCounterState: function(counterState) {
        // Invalidate cached round state.
        this.cachedRoundState = null;

        if (!(counterState.getId() in this.counters)) {
            let counter;
            switch (counterState.getType()) {
                case Constants.COUNTER_TYPES.TIMER_COUNTDOWN:
                {
                    counter = TimerCountdownCounter.create(counterState, this, this.relayEvent, this);
                    break;
                }
                case Constants.COUNTER_TYPES.OVERTIME_COUNT_UP:
                {
                    counter = OvertimeCountUpCounter.create(counterState, this, this.relayEvent, this);
                    break;
                }
            }

            this.counters[counterState.getId()] = counter;

            this.counterCreated = true;
            this._notifyEventListeners(RoundModel._EVENTS.COUNTER_CREATED, counter);
        } else {
            // Intentionally do not synch existing counters.
            //this.counters[counterState.getId()].setCounterState(counterState);
        }
    },

    setZoneState: function(zoneState) {
        // Invalidate cached round state.
        this.cachedRoundState = null;

        if (!(zoneState.getId() in this.zones)) {
            let zone;
            let b2dBody = null;
            switch (zoneState.getType()) {
                case Constants.ZONE_TYPES.SPAWN:
                {
                    zone = SpawnZone.create(zoneState, this, this.relayEvent, this);
                    b2dBody = B2DUtils.createSpawnZoneBody(this.b2dworld, zone, zone.getField("radius"));
                    break;
                }
            }

            zone.setB2DBody(b2dBody);

            this.zones[zoneState.getId()] = zone;

            this.zoneCreated = true;
            this._notifyEventListeners(RoundModel._EVENTS.ZONE_CREATED, zone);
        } else {
            // Intentionally do not synch existing zones.
            //this.zones[zoneState.getId()].setZoneState(zoneState);
            //this.zoneChanged = true;
            //this._notifyEventListeners(RoundModel._EVENTS.ZONE_CHANGED, this.zones[zoneState.getId()]);
        }
    },

    emitTankState: function(tankState) {
        this._notifyEventListeners(RoundModel._EVENTS.TANK_CHANGED, tankState);
    },

    getRoundState: function(expandedState) {
        expandedState |= this.weaponCreated || this.upgradeCreated || this.counterCreated || this.zoneCreated; // || this.zoneChanged

        if (this.cachedRoundState) {
            if (expandedState && this.cachedRoundState.isExpanded() || !expandedState && !this.cachedRoundState.isExpanded()) {
                return this.cachedRoundState;
            }
        }

        const rs = RoundState.create();
        const tankStates = [];
        const projectileStates = [];
        const collectibleStates = [];
        const playerIds = Object.keys(this.tanks);
        for (let i = 0;i<playerIds.length;i++) {
            const playerId = playerIds[i];
            if (this.destroyedPlayerIds.indexOf(playerId) >= 0) {
                continue;
            }
            const tank = this.tanks[playerId];
            tankStates.push(tank.getTankState());
        }
        rs.setTankStates(tankStates);

        const projectileIds = Object.keys(this.projectiles);
        for (let i = 0;i<projectileIds.length;i++) {
            const projectileId = projectileIds[i];
            if (this.destroyedProjectileIds.indexOf(projectileId) >= 0) {
                continue;
            }
            const projectile = this.projectiles[projectileId];
            projectileStates.push(projectile.getProjectileState());
        }
        rs.setProjectileStates(projectileStates);

        const collectibleIds = Object.keys(this.collectibles);
        for (let i = 0;i<collectibleIds.length;i++) {
            const collectibleId = collectibleIds[i];
            if (this.destroyedCollectibleIds.indexOf(collectibleId) >= 0) {
                continue;
            }
            const collectible = this.collectibles[collectibleId];
            collectibleStates.push(collectible.getCollectibleState());
        }
        rs.setCollectibleStates(collectibleStates);

        if (expandedState) {
            this._getExpandedRoundState(rs);
        }

        this.cachedRoundState = rs;

        return rs;
    },

    _getExpandedRoundState: function(rs) {
        const weaponStates = [];
        const weaponIds = Object.keys(this.weapons);
        for (let i = 0;i<weaponIds.length;i++) {
            const weaponId = weaponIds[i];
            const weapon = this.weapons[weaponId];
            weaponStates.push(weapon.getWeaponState());
        }
        rs.setWeaponStates(weaponStates);

        const upgradeStates = [];
        const upgradeIds = Object.keys(this.upgrades);
        for (let i = 0;i<upgradeIds.length;i++) {
            const upgradeId = upgradeIds[i];
            const upgrade = this.upgrades[upgradeId];
            upgradeStates.push(upgrade.getUpgradeState());
        }
        rs.setUpgradeStates(upgradeStates);

        const counterStates = [];
        const counterIds = Object.keys(this.counters);
        for (let i = 0;i<counterIds.length;++i) {
            const counterId = counterIds[i];
            const counter = this.counters[counterId];
            counterStates.push(counter.getCounterState());
        }
        rs.setCounterStates(counterStates);

        const zoneStates = [];
        const zoneIds = Object.keys(this.zones);
        for (let i = 0;i<zoneIds.length;++i) {
            const zoneId = zoneIds[i];
            if (this.destroyedZoneIds.indexOf(zoneId) >= 0) {
                continue;
            }
            const zone = this.zones[zoneId];
            zoneStates.push(zone.getZoneState());
        }
        rs.setZoneStates(zoneStates);
    },

    clearExpandedRoundStateBits: function() {
        this.weaponCreated = false;
        this.upgradeCreated = false;
        this.counterCreated = false;
        this.zoneCreated = false;
        //this.zoneChanged = false;
    },
    
    getTank: function(playerId) {
        return this.tanks[playerId];
    },

    getTankCount: function() {
        return Object.keys(this.tanks).length;
    },

    getCrateCount: function() {
        let sum = 0;
        for (let i = 0; i < Constants.COLLECTIBLE_TYPES.CRATE_COUNT; ++i) {
            sum += this.collectibleCounts[i];
        }

        return sum;
    },

    getCollectibleCount: function(collectibleType) {
        return this.collectibleCounts[collectibleType];
    },

    getGoldSpawnCount: function() {
        return this.goldSpawnCount;
    },

    getDiamondSpawnCount: function() {
        return this.diamondSpawnCount;
    },

    getTanks: function() {
        return this.tanks;
    },

    destroyTank: function(playerId) {
        // Invalidate cached round state.
        this.cachedRoundState = null;

        this.destroyedPlayerIds.push(playerId);
        this._notifyEventListeners(RoundModel._EVENTS.TANK_DESTROYED, playerId);
    },

    killTank: function(kill) {
        // Invalidate cached round state.
        this.cachedRoundState = null;

        this.log.debug('Marking tank ' + kill.getVictimPlayerId() + ' as killed');
        this.destroyedPlayerIds.push(kill.getVictimPlayerId());
        this._notifyEventListeners(RoundModel._EVENTS.TANK_KILLED, kill);
    },
    
    getProjectile: function(projectileId) {
        return this.projectiles[projectileId];
    },
    
    getProjectiles: function() {
        return this.projectiles;
    },

    getCollectible: function(collectibleId) {
        return this.collectibles[collectibleId];
    },

    getCollectibles: function() {
        return this.collectibles;
    },

    getWeapons: function() {
        return this.weapons;
    },
    
    getActiveWeapon: function(playerId) {
        const otherWeaponIds = this.playerIdOtherWeaponIds[playerId];
        if (!otherWeaponIds || otherWeaponIds.length == 0) {
            return this.getDefaultWeapon(playerId);
        } else {
            return this.weapons[otherWeaponIds[otherWeaponIds.length - 1]];
        }
    },
    
    getQueuedWeapons: function(playerId) {
        const otherWeaponIds = this.playerIdOtherWeaponIds[playerId];
        const result = [];
        if (otherWeaponIds) {
            for (let i = 0; i < otherWeaponIds.length - 1; ++i) {
                result.push(this.weapons[otherWeaponIds[i]]);
            }
        }
        
        return result;
    },
    
    getDefaultWeapon: function(playerId) {
        const weaponId = this.playerIdDefaultWeaponId[playerId];
        if (weaponId) {
            return this.weapons[weaponId];
        } else {
            return null;
        }
    },

    getUpgrades: function() {
        return this.upgrades;
    },

    getUpgrade: function(upgradeId) {
        return this.upgrades[upgradeId];
    },

    getUpgradeByPlayerIdAndType: function(playerId, type) {
        for(upgradeId in this.upgrades) {
            const upgrade = this.upgrades[upgradeId];
            if (upgrade.getPlayerId() === playerId && upgrade.getType() === type) {
                return upgrade;
            }
        }

        return null;
    },

    getCounters: function() {
        return this.counters;
    },

    getCounter: function(counterId) {
        return this.counters[counterId];
    },

    getZones: function() {
        return this.zones;
    },

    getZone: function(zoneId) {
        return this.zones[zoneId];
    },

    destroyProjectile: function(projectileId) {
        const projectile = this.projectiles[projectileId];
        if (projectile) {
            // Invalidate cached round state.
            this.cachedRoundState = null;

            const defaultWeapon = this.getDefaultWeapon(projectile.getPlayerId());
            if (defaultWeapon && defaultWeapon.getType() === projectile.getType()) {
                defaultWeapon.reload(projectile);
            }
            this.destroyedProjectileIds.push(projectileId);
            this._notifyEventListeners(RoundModel._EVENTS.PROJECTILE_DESTROYED, projectileId);
        } 
    },

    timeoutProjectile: function(projectileId) {
        const projectile = this.projectiles[projectileId];
        if (projectile) {
            // Invalidate cached round state.
            this.cachedRoundState = null;

            const defaultWeapon = this.getDefaultWeapon(projectile.getPlayerId());
            if (defaultWeapon && defaultWeapon.getType() === projectile.getType()) {
                defaultWeapon.reload(projectile);
            }
            this.destroyedProjectileIds.push(projectileId);
            this._notifyEventListeners(RoundModel._EVENTS.PROJECTILE_TIMEOUT, projectileId);
        }
    },

    destroyCollectible: function(pickup) {
        const collectible = this.collectibles[pickup.getCollectibleId()];
        if (collectible) {
            // Invalidate cached round state.
            this.cachedRoundState = null;

            this.destroyedCollectibleIds.push(pickup.getCollectibleId());
            this.collectibleCounts[collectible.getType()]--;
            this._notifyEventListeners(RoundModel._EVENTS.COLLECTIBLE_DESTROYED, pickup);
        }
    },

    updateWeapon: function(playerId, weaponId) {
        const weapon = this.weapons[weaponId];
        if (weapon) {
            // Update tank's body.
            const tank = this.tanks[playerId];
            if (tank) {
                B2DUtils.updateTankBodyTurret(tank.getB2DBody(), tank, weapon);
            }
        }
    },

    destroyWeapon: function(weaponDeactivation) {
        const weaponId = weaponDeactivation.getWeaponId();
        const playerId = weaponDeactivation.getPlayerId();
        const weapon = this.weapons[weaponId];
        if (weapon) {
            // Invalidate cached round state.
            this.cachedRoundState = null;

            delete this.weapons[weaponId];

            const defaultWeaponId = this.playerIdDefaultWeaponId[playerId];
            if (defaultWeaponId === weaponId) {
                this.playerIdDefaultWeaponId[playerId] = null;
            } else {
                const otherWeaponIds = this.playerIdOtherWeaponIds[playerId];
                for (let i = 0; i < otherWeaponIds.length; ++i) {
                    if (otherWeaponIds[i] === weaponId) {
                        otherWeaponIds.splice(i, 1);
                        break;
                    }
                }
            }
            
            // Update tank's body.
            const newWeapon = this.getActiveWeapon(playerId);
            const tank = this.tanks[playerId];
            if (newWeapon && tank) {
                B2DUtils.updateTankBodyTurret(tank.getB2DBody(), tank, newWeapon);
            }

            this._notifyEventListeners(RoundModel._EVENTS.WEAPON_DESTROYED, weaponDeactivation);
        }
    },

    destroyUpgrade: function(upgradeUpdate) {
        const upgradeId = upgradeUpdate.getUpgradeId();
        const playerId = upgradeUpdate.getPlayerId();
        const upgrade = this.upgrades[upgradeId];
        if (upgrade) {
            // Invalidate cached round state.
            this.cachedRoundState = null;

            delete this.upgrades[upgradeId];

            const upgradeIds = this.playerIdUpgradeIds[playerId];
            for (let i = 0; i < upgradeIds.length; ++i) {
                if (upgradeIds[i] === upgradeId) {
                    upgradeIds.splice(i, 1);
                    break;
                }
            }

            // Update map from tank to modifiers.
            this._updateModifiers(playerId);

            // Update tank's body.
            const tank = this.tanks[playerId];
            if (tank) {
                B2DUtils.removeTankBodyUpgrade(tank.getB2DBody(), upgrade.getType());
            }

            this._notifyEventListeners(RoundModel._EVENTS.UPGRADE_DESTROYED, upgradeUpdate);
        }
    },

    destroyCounter: function(counterId) {
        const counter = this.counters[counterId];
        if (counter) {
            // Invalidate cached round state.
            this.cachedRoundState = null;

            delete this.counters[counterId];

            this._notifyEventListeners(RoundModel._EVENTS.COUNTER_DESTROYED, counterId);
        }
    },

    destroyZone: function(zoneId) {
        const zone = this.zones[zoneId];
        if (zone) {
            // Invalidate cached round state.
            this.cachedRoundState = null;

            this.destroyedZoneIds.push(zoneId);
            this._notifyEventListeners(RoundModel._EVENTS.ZONE_DESTROYED, zoneId);
        }
    },

    update: function(deltaTime) {
        if (!this.running) {
            return;
        }

        // Invalidate cached round state.
        this.cachedRoundState = null;

        this._removeDestroyed();
        this.b2dworld.Step(deltaTime, 10, 10);
        this._filterAndDispatchCollisionEvents();
        this._removeDestroyed();
        
        // Iterate over all elements and call update
        for (const tank in this.tanks) {
            this.tanks[tank].update(deltaTime);
        }
        for (const projectile in this.projectiles) {
            this.projectiles[projectile].update(deltaTime);
        }
        for (const collectible in this.collectibles) {
            this.collectibles[collectible].update(deltaTime);
        }
        for (const weapon in this.weapons) {
            this.weapons[weapon].update(deltaTime);
        }
        for (const upgrade in this.upgrades) {
            this.upgrades[upgrade].update(deltaTime);
        }
        for (const counter in this.counters) {
            this.counters[counter].update(deltaTime);
        }
        for (const zone in this.zones) {
            this.zones[zone].update(deltaTime);
        }
    },

    _filterAndDispatchCollisionEvents: function() {
        const dispatchedCollisionEvents = [];
        
        for (let i = 0; i < this.collisionEvents.length; ++i) {
            const event = this.collisionEvents[i];
            
            // Make sure to filter duplicate collision events:
            // - filter so that a tank can only be involved in one event of each type per step.
            //      - do this by only checking type and tankA properties of event data, and ignoring maze and projectile properties.
            // - filter so that a collectible can only be involved in one event of each type per step.
            //      - do this by only checking type and collectible properties of event data, and ignoring tankA, tankB and maze properties.
            // - filter so that a shield can only be involved in one event of each type per step.
            //      - do this by only checking type and shieldA properties of event data, and ignoring tankA, tankB and maze properties.
            // - filter so that a zone can only be involved in one event of each type per step (except projectile-zone collisions).
            //      - do this by only checking type and zone properties of event data, and ignoring tankA, tankB and maze properties.
            // - filter so that a projectile can only be involved in one event of each type per step (except projectile-maze and projectile-shield collisions).
            //      - do this by only checking type and projectile properties of event data, and ignoring tankA, tankB and maze properties.
            let eventAlreadyDispatched = false;
            for (let j = 0; j < dispatchedCollisionEvents.length; ++j) {
                const dispatchedEvent = dispatchedCollisionEvents[j];
                if (event.collisionType === dispatchedEvent.collisionType &&
                    ((event.data.tankA !== undefined && event.data.tankA === dispatchedEvent.data.tankA) ||
                     (event.data.collectible !== undefined && event.data.collectible === dispatchedEvent.data.collectible) ||
                     (event.data.shieldA !== undefined && event.data.shieldA === dispatchedEvent.data.shieldA) ||
                     (event.data.zone !== undefined && event.data.zone === dispatchedEvent.data.zone && event.collisionType !== RoundModel._EVENTS.PROJECTILE_ZONE_COLLISION) ||
                     (event.data.projectile !== undefined && event.data.projectile === dispatchedEvent.data.projectile && event.collisionType !== RoundModel._EVENTS.PROJECTILE_MAZE_COLLISION && event.collisionType !== RoundModel._EVENTS.PROJECTILE_SHIELD_COLLISION)
                    )
                ) {
                    eventAlreadyDispatched = true;
                    break;
                }
            }
            if (!eventAlreadyDispatched) {
                dispatchedCollisionEvents.push(event);
                this._notifyEventListeners(event.collisionType, event.data);
            }
        }
        this.collisionEvents = [];
    },

    _removeDestroyed: function() {
        // Clean this.tanks, this.projectiles, this.collectibles and remove b2d bodies
        for (let i = 0; i < this.destroyedPlayerIds.length; ++i) {
            const tank = this.tanks[this.destroyedPlayerIds[i]];
            if (tank) {
                this.b2dworld.DestroyBody(tank.getB2DBody());
                delete this.tanks[this.destroyedPlayerIds[i]];

                delete this.weapons[this.playerIdDefaultWeaponId[this.destroyedPlayerIds[i]]];
                for (let j = 0; j < this.playerIdOtherWeaponIds[this.destroyedPlayerIds[i]].length; ++j) {
                    delete this.weapons[this.playerIdOtherWeaponIds[this.destroyedPlayerIds[i]][j]];
                }

                delete this.playerIdDefaultWeaponId[this.destroyedPlayerIds[i]];
                delete this.playerIdOtherWeaponIds[this.destroyedPlayerIds[i]];

                for (let j = 0; j < this.playerIdUpgradeIds[this.destroyedPlayerIds[i]].length; ++j) {
                    delete this.upgrades[this.playerIdUpgradeIds[this.destroyedPlayerIds[i]][j]];
                }

                delete this.playerIdUpgradeIds[this.destroyedPlayerIds[i]];

                delete this.playerIdModifiers[this.destroyedPlayerIds[i]];
            } else {
                // Only report this as an error on the server, since out-of-focus browser tabs can cause the model to be out of synch when an update (and therefore _removeDestroyed) is finally called. 
                if (Constants.getMode() == Constants.MODE_SERVER) {
                    this.log.error("Tried to destroy tank which was already gone: " + this.destroyedPlayerIds[i]);
                }
            }
        }
        this.destroyedPlayerIds = [];

        for (let i = 0; i < this.destroyedProjectileIds.length; ++i) {
            const projectile = this.projectiles[this.destroyedProjectileIds[i]];
            if (projectile) {
                this.b2dworld.DestroyBody(projectile.getB2DBody());
                delete this.projectiles[this.destroyedProjectileIds[i]];
            } else {
                // Only report this as an error on the server, since out-of-focus browser tabs can cause the model to be out of synch when an update (and therefore _removeDestroyed) is finally called. 
                if (Constants.getMode() == Constants.MODE_SERVER) {
                    this.log.error("Tried to destroy projectile which was already gone: " + this.destroyedProjectileIds[i]);
                }
            }
        }
        this.destroyedProjectileIds = [];

        for (let i = 0; i < this.destroyedCollectibleIds.length; ++i) {
            const collectible = this.collectibles[this.destroyedCollectibleIds[i]];
            if (collectible) {
                this.b2dworld.DestroyBody(collectible.getB2DBody());
                delete this.collectibles[this.destroyedCollectibleIds[i]];
            } else {
                // Only report this as an error on the server, since out-of-focus browser tabs can cause the model to be out of synch when an update (and therefore _removeDestroyed) is finally called. 
                if (Constants.getMode() == Constants.MODE_SERVER) {
                    this.log.error("Tried to destroy collectible which was already gone: " + this.destroyedCollectibleIds[i]);
                }
            }
        }
        this.destroyedCollectibleIds = [];

        for (let i = 0; i < this.destroyedZoneIds.length; ++i) {
            const zone = this.zones[this.destroyedZoneIds[i]];
            if (zone) {
                this.b2dworld.DestroyBody(zone.getB2DBody());
                delete this.zones[this.destroyedZoneIds[i]];
            } else {
                // Only report this as an error on the server, since out-of-focus browser tabs can cause the model to be out of synch when an update (and therefore _removeDestroyed) is finally called.
                if (Constants.getMode() == Constants.MODE_SERVER) {
                    this.log.error("Tried to destroy zone which was already gone: " + this.destroyedZoneIds[i]);
                }
            }
        }
        this.destroyedZoneIds = [];

    },

    addEventListener: function(callback, context, gameId) {
        this.eventListeners.push({cb: callback, ctxt: context, gameId: gameId});
    },

    removeEventListener: function(callback, context) {
        for (let i = 0;i<this.eventListeners.length;i++) {
            if (this.eventListeners[i].cb===callback && this.eventListeners[i].ctxt===context) {
                this.eventListeners.splice(i, 1);
                return;
            }
        }
    },

    _notifyEventListeners: function(evt, data) {
        for (let i = 0;i<this.eventListeners.length;i++) {
            try {
                this.eventListeners[i].cb(this.eventListeners[i].ctxt, this.eventListeners[i].gameId, evt, data);
            } catch (err) {
                this.log.error(err.stack, err);
            }
        }
    },

    createRound: function(ranked) {
        this.ranked = ranked;
        this._notifyEventListeners(RoundModel._EVENTS.ROUND_CREATED, ranked);
    },

    startRound: function() {
        this.started = true;
        this._notifyEventListeners(RoundModel._EVENTS.ROUND_STARTED);
    },

    endRound: function(victoryAward) {
        this.started = false;
        this.running = false;

        this._notifyEventListeners(RoundModel._EVENTS.ROUND_ENDED, victoryAward);

        // Explicitly delete our references to stored objects
        // to hopefully induce an expedient GC
        // Do NOT cleanup the event listeners here, as CELEBRATION_STARTED and CELEBRATION_ENDED events happen AFTER!
        this.b2dworld = null;
        this.tanks = {};
        this.projectiles =  {};
        this.collectibles = {};
        this.weapons = {};
        this.upgrades = {};
        this.counters = {};
        this.collisionEvents = [];
        this.destroyedPlayerIds = [];
        this.destroyedProjectileIds = [];
        this.destroyedCollectibleIds = [];
        this.destroyedZoneIds = [];
        this.playerIdOtherWeaponIds = {};
        this.playerIdDefaultWeaponId = {};
        this.playerIdUpgradeIds = {};
        this.playerIdModifiers = {};
    },

    startCelebration: function() {
        this.maze = null;
        this._notifyEventListeners(RoundModel._EVENTS.CELEBRATION_STARTED);
    },

    endCelebration: function() {
        this._notifyEventListeners(RoundModel._EVENTS.CELEBRATION_ENDED);
    },

    getStarted: function() {
        return this.started;
    },

    setVictoryGoldAmount: function(victoryGoldAmount) {
        this.victoryGoldAmount = victoryGoldAmount;
    },

    getVictoryGoldAmount: function() {
        return this.victoryGoldAmount;
    },

    setStakes: function(stakes) {
        this.stakes = stakes;
    },

    getStake: function(playerId) {
        for (let i = 0; i < this.stakes.length; ++i) {
            const stake = this.stakes[i];
            if (stake.playerId == playerId) {
                return stake;
            }
        }

        return null;
    },

    getRankChanges: function(winnerPlayerIds) {
        if (!this.ranked) {
            return [];
        }

        const changes = {};
        const rankBeforeChanges = {};

        // Get the rank changes. If there are any winners, share the total stakes among them.
        // If there are no winners, only take the stakes of the punishable players.
        if (winnerPlayerIds.length > 0) {
            let totalStakes = 0;
            for (let i = 0; i < this.stakes.length; ++i) {
                const stake = this.stakes[i];
                changes[stake.playerId] = -stake.value;
                rankBeforeChanges[stake.playerId] = stake.rank;
                totalStakes += stake.value;
            }

            const stakesPerWinner = Math.ceil(totalStakes / winnerPlayerIds.length);

            for (let i = 0; i < winnerPlayerIds.length; ++i) {
                changes[winnerPlayerIds[i]] += stakesPerWinner;
            }
        } else {
            for (let i = 0; i < this.stakes.length; ++i) {
                const stake = this.stakes[i];
                for (let j = 0; j < this.punishablePlayerIds.length; ++j) {
                    if (stake.playerId == this.punishablePlayerIds[j]) {
                        changes[stake.playerId] = -stake.value;
                        rankBeforeChanges[stake.playerId] = stake.rank;

                        break;
                    }
                }
            }
        }
        // Convert from object to array.
        const changesArray = [];
        for (const playerId in changes) {
            changesArray.push({playerId: playerId, rank: rankBeforeChanges[playerId], change: changes[playerId]});
        }

        return changesArray;
    },

    getModifier: function(playerId, modifierType) {
        return this.playerIdModifiers[playerId][modifierType];
    },

    relayEvent: function(self, evt, data) {
        self._notifyEventListeners(evt, data);
    },

    _updateModifiers: function(playerId) {
        const newModifiers = {};

        for (const modifierType in Constants.MODIFIER_TYPES) {
            const modifier = Constants.MODIFIER_TYPES[modifierType];
            newModifiers[modifier] = Constants.MODIFIER_INFO[modifier].DEFAULT;
        }

        const upgradeIds = this.playerIdUpgradeIds[playerId];
        for (let i = 0; i < upgradeIds.length; ++i) {
            const upgrade = this.upgrades[upgradeIds[i]];
            switch(upgrade.getType()) {
                case Constants.UPGRADE_TYPES.SPEED_BOOST:
                {
                    newModifiers[Constants.MODIFIER_TYPES.SPEED] += upgrade.getField("speedBoost");
                    break;
                }
            }
        }

        this.playerIdModifiers[playerId] = newModifiers;
    },

    getB2DWorld: function() {
        return this.b2dworld;
    }

});

RoundModel.classFields({
    _EVENTS: {
        MAZE_SET: "maze set",
        TANK_CREATED: "tank created",
        TANK_DESTROYED: "tank destroyed",
        TANK_KILLED: "tank killed",
        PROJECTILE_CREATED: "projectile created",
        PROJECTILE_DESTROYED: "projectile destroyed",
        PROJECTILE_TIMEOUT: "projectile timeout",
        COLLECTIBLE_CREATED: "collectible created",
        COLLECTIBLE_DESTROYED: "collectible destroyed",
        WEAPON_CREATED: "weapon created",
        WEAPON_DESTROYED: "weapon destroyed",
        UPGRADE_CREATED: "upgrade created",
        UPGRADE_DESTROYED: "upgrade destroyed",
        COUNTER_CREATED: "counter created",
        COUNTER_DESTROYED: "counter destroyed",
        ZONE_CREATED: "zone created",
        ZONE_DESTROYED: "zone destroyed",
        TANK_TANK_COLLISION: "tank tank collision",
        TANK_MAZE_COLLISION: "tank maze collision",
        TANK_COLLECTIBLE_COLLISION: "tank collectible collision",
        TANK_DEADLY_COLLISION: "tank deadly collision",
        TANK_SHIELD_COLLISION: "tank shield collision",
        TANK_ZONE_COLLISION: "tank zone collision",
        PROJECTILE_MAZE_COLLISION: "projectile maze collision",
        PROJECTILE_SHIELD_COLLISION: "projectile shield collision",
        PROJECTILE_ZONE_COLLISION: "projectile zone collision",
        SHIELD_SHIELD_COLLISION: "shield shield collision",
        SHIELD_ZONE_COLLISION: "shield zone collision",
        ROUND_CREATED: "round created",
        ROUND_STARTED: "round started",
        ROUND_ENDED: "round ended",
        CELEBRATION_STARTED: "celebration started",
        CELEBRATION_ENDED: "celebration ended",
        TANK_CHICKENED_OUT: "tank chickened out",       // Emitted when a tank illegally leaves the round.
        TANK_CHANGED: "tank changed"                  // Emitted every client frame and contains the client's tank state.
    }    
});

if (typeof module === 'object') {
    module.exports = RoundModel;
}
