if (typeof require === 'function') {
    var Classy = require('./classy');
    var MazeMap = require('./mazemap');
    var Constants = require('./constants');
    var B2DUtils = require('./b2dutils');
    var MathUtils = require('./mathutils');
    var InputState = require('./inputstate');
    var RoundModel = require('./roundmodel');
    var AIUtils = require('./aiutils');
}

var AI = Classy.newClass();

AI.fields({
    aiId: null,
    config: null,
    gameController: null,

    // State based on round state.
    myPosition: null,           // x and y position in tiles
    tankPositions: {},          // Map of x and y positions in tiles
    projectilePositions: {},    // Map of x and y positions in tiles
    projectilePaths: {},        // Map of paths for considered projectiles
    weaponCratePositions: [],   // List of x and y positions in tiles
    shieldCratePositions: [],   // List of x and y positions in tiles
    goldPositions: [],          // List of x and y positions in tiles
    diamondPositions: [],       // List of x and y positions in tiles
    laserAimerPaths: {},        // Map of paths for considered laser aimers
    threatMap: null,            // Map with current threats
    // State based on events.
    kills: [],                  // List of kills
    stuckNormal: null,
    stuckNow: false,            // Stuck in this frame
    stuckTime: 0,               // Milliseconds being stuck
    // State based on traits.
    currentAggressiveness: null,
    currentGreediness: null,

    goal: null,         // Current goal. Contains type, priority, id, period AND type specific parameters.
    nextGoalId: 1,
    actions: [],        // List of actions to achieve currently selected goal sorted first to last.
    inputState: null
});

AI.constructor(function(aiId, config, gameController) {
    this.aiId = aiId;
    this.config = config;
    this.gameController = gameController;

    this._reset();

    this.inputState = InputState.withState(this.aiId, false, false, false, false, false);
    this.gameController.addRoundEventListener(this._roundEventHandler, this);
});

AI.methods({
    update: function(deltaTime) {
        this._updateState(deltaTime);

        if (this._makeDecisionsAndUpdateGoal(deltaTime)) {
            this._updateActionsToAchieveGoal();
        }

        this._updateInputToDoAction();

        this._updateAndRemovePerformedActions(deltaTime);
    },

    shutdown: function() {
        this.gameController.removeRoundEventListener(this._roundEventHandler, this);
    },

    getInputState: function() {
        return this.inputState;
    },

    _roundEventHandler: function(self, id, evt, data) {
        switch(evt) {
            case RoundModel._EVENTS.TANK_KILLED:
            {
                if ((data.getKillerPlayerId() == self.aiId && data.getVictimPlayerId() !== self.aiId) ||
                    (data.getKillerPlayerId() !== self.aiId && data.getVictimPlayerId() == self.aiId)) {
                    self.kills.push(data);

                    if (self.kills.length > Constants.AI.KILLS_TO_REMEMBER) {
                        self.kills.shift();
                    }
                }
                break;
            }
            case RoundModel._EVENTS.ROUND_CREATED:
            {
                // Reset goal and relevant state.
                self._reset();
                break;
            }
            case RoundModel._EVENTS.TANK_MAZE_COLLISION:
            {
                if (data.tankA.getPlayerId() == self.aiId) {
                    self.stuckNormal = data.collisionNormal;
                    self.stuckNow = true;
                }
                break;
            }
        }
    },

    _updateState: function(deltaTime) {
        const self = this;

        const tank = this.gameController.getTank(this.aiId);
        if (tank == undefined) {
            return;
        }

        this.myPosition = {x: Math.floor(tank.getX()/Constants.MAZE_TILE_SIZE.m), y: Math.floor(tank.getY()/Constants.MAZE_TILE_SIZE.m)};

        // FIXME Share tankPositions, collectible positions and projectilePositions between AIs.
        const tanks = this.gameController.getTanks();
        this.tankPositions = {};
        for (const tank in tanks) {
            this.tankPositions[tank] = {x: Math.floor(tanks[tank].getX()/Constants.MAZE_TILE_SIZE.m), y: Math.floor(tanks[tank].getY()/Constants.MAZE_TILE_SIZE.m)};
        }

        const collectibles = this.gameController.getCollectibles();
        this.weaponCratePositions = [];
        this.shieldCratePositions = [];
        this.goldPositions = [];
        this.diamondPositions = [];
        for (const collectible in collectibles) {
            const position = {x: Math.floor(collectibles[collectible].getX()/Constants.MAZE_TILE_SIZE.m), y: Math.floor(collectibles[collectible].getY()/Constants.MAZE_TILE_SIZE.m)};
            switch(collectibles[collectible].getType()) {
                case Constants.COLLECTIBLE_TYPES.CRATE_LASER:
                case Constants.COLLECTIBLE_TYPES.CRATE_DOUBLE_BARREL:
                case Constants.COLLECTIBLE_TYPES.CRATE_SHOTGUN:
                case Constants.COLLECTIBLE_TYPES.CRATE_HOMING_MISSILE:
                {
                    this.weaponCratePositions.push(position);
                    break;
                }
                case Constants.COLLECTIBLE_TYPES.CRATE_SHIELD:
                {
                    this.shieldCratePositions.push(position);
                    break;
                }
                case Constants.COLLECTIBLE_TYPES.GOLD:
                {
                    this.goldPositions.push(position);
                    break;
                }
                case Constants.COLLECTIBLE_TYPES.DIAMOND:
                {
                    this.diamondPositions.push(position);
                    break;
                }
            }
        }

        let projectiles = this.gameController.getProjectiles();
        this.projectilePositions = {};
        this.projectilePaths = {};
        this.laserAimerPaths = {};
        for (const projectile in projectiles) {
            this.projectilePositions[projectile] = {x: Math.floor(projectiles[projectile].getX()/Constants.MAZE_TILE_SIZE.m), y: Math.floor(projectiles[projectile].getY()/Constants.MAZE_TILE_SIZE.m)};
        }

        const maze = this.gameController.getMaze();
        if (maze) {
            if (this.threatMap) {
                this.threatMap.clear(0);
            } else {
                // Allocate new threat map.
                this.threatMap = MazeMap.create(maze.getWidth(), maze.getHeight(), 0);
            }

            // Add projectiles to threat map.
            const maxProjectileDistanceToConsider = MathUtils.linearInterpolation(Constants.AI.MIN_PROJECTILE_DISTANCE_TO_CONSIDER, Constants.AI.MAX_PROJECTILE_DISTANCE_TO_CONSIDER, this.config[AI._TRAITS.CLEVERNESS]);
            const projectileBounces = Math.ceil(MathUtils.linearInterpolation(Constants.AI.MIN_PROJECTILE_BOUNCES, Constants.AI.MAX_PROJECTILE_BOUNCES, this.config[AI._TRAITS.CLEVERNESS]));
            const projectilePathLength = MathUtils.linearInterpolation(Constants.AI.MIN_PROJECTILE_PATH_LENGTH, Constants.AI.MAX_PROJECTILE_PATH_LENGTH, this.config[AI._TRAITS.CLEVERNESS]);
            projectiles = this.gameController.getProjectiles();
            for (const projectile in projectiles) {
                const projectileDistance = maze.getDistanceBetweenPositions(this.myPosition, this.projectilePositions[projectile]);
                if (projectileDistance !== false && projectileDistance <= maxProjectileDistanceToConsider) {
                    const pathInfo = B2DUtils.calculateProjectilePath(this.gameController.getB2DWorld(), projectiles[projectile], projectileBounces, Constants.MAZE_TILE_SIZE.m * projectilePathLength, false);
                    this.projectilePaths[projectile] = pathInfo.path;
                    const projectileSpeed = Math.sqrt(projectiles[projectile].getSpeedX() * projectiles[projectile].getSpeedX() + projectiles[projectile].getSpeedY() * projectiles[projectile].getSpeedY());
                    B2DUtils.splatPathUntoMazeMap(this.threatMap, pathInfo.path, Constants.MAZE_TILE_SIZE.m * Constants.AI.PATH_STEP_SIZE, function (tile, length, stepSize) {
                        const distance = maze.getDistanceBetweenPositions(tile, self.myPosition);
                        if (distance === false) {
                            return 0;
                        }
                        const projectileTimeToHere = length / projectileSpeed;
                        const tankTimeToHere = distance * Constants.MAZE_TILE_SIZE.m / Constants.TANK.FORWARD_SPEED.m;

                        return Math.min(1, Math.max(0, 1 - Math.abs(projectileTimeToHere - tankTimeToHere) * Constants.AI.PROJECTILE_THREAT_TIME_FALLOFF)) * Constants.AI.PROJECTILE_THREAT_WEIGHT * stepSize;
                    });

                }
            }

            // Add tanks to threat map.
            const maxTankDistanceToConsider = MathUtils.linearInterpolation(Constants.AI.MIN_TANK_THREAT_DISTANCE_TO_CONSIDER, Constants.AI.MAX_TANK_THREAT_DISTANCE_TO_CONSIDER, this.config[AI._TRAITS.CLEVERNESS]);
            const firingPathBounces = Math.ceil(MathUtils.linearInterpolation(Constants.AI.MIN_FIRING_THREAT_PATH_BOUNCES, Constants.AI.MAX_FIRING_THREAT_PATH_BOUNCES, this.config[AI._TRAITS.CLEVERNESS]));
            const firingPathLength = MathUtils.linearInterpolation(Constants.AI.MIN_FIRING_THREAT_PATH_LENGTH, Constants.AI.MAX_FIRING_THREAT_PATH_LENGTH, this.config[AI._TRAITS.CLEVERNESS]);
            for (const tank in tanks) {
                if (tank !== this.aiId) {
                    // FIXME Do not consider team mates!
                    const tankDistance = maze.getDistanceBetweenPositions(this.myPosition, this.tankPositions[tank]);
                    if (tankDistance !== false && tankDistance <= maxTankDistanceToConsider) {
                        const pathInfo = B2DUtils.calculateFiringPath(this.gameController.getB2DWorld(), tanks[tank], 0, firingPathBounces, Constants.MAZE_TILE_SIZE.m * firingPathLength, false);
                        B2DUtils.splatPathUntoMazeMap(this.threatMap, pathInfo.path, Constants.MAZE_TILE_SIZE.m * Constants.AI.PATH_STEP_SIZE, function (tile, length, stepSize) {
                            return (1.0 - length / (Constants.MAZE_TILE_SIZE.m * firingPathLength)) * Constants.AI.FIRING_PATH_THREAT_WEIGHT * stepSize;
                        });
                        // Add threat near tank position.
                        maze.traverseCloseTiles(this.tankPositions[tank], 1, function(current) {
                            self.threatMap.add(current, Constants.AI.TANK_THREAT_WEIGHT / (current.distance + 1));
                        });
                    }
                }
            }

            // Add upgrades to threat map.
            // FIXME Check when adding upgrade.
            const upgrades = this.gameController.getUpgrades();
            for (const upgradeId in upgrades) {
                const upgrade = upgrades[upgradeId];
                if (upgrade.getPlayerId() !== this.aiId) {
                    // FIXME Do not consider team mates!
                    switch(upgrade.getType()) {
                        case Constants.UPGRADE_TYPES.LASER_AIMER:
                        {
                            const pathInfo = B2DUtils.calculateFiringPath(this.gameController.getB2DWorld(), tanks[upgrade.getPlayerId()], 0, Number.MAX_VALUE, upgrade.getField("length"), true);
                            this.laserAimerPaths[upgradeId] = pathInfo.path;
                            B2DUtils.splatPathUntoMazeMap(this.threatMap, pathInfo.path, Constants.MAZE_TILE_SIZE.m * Constants.AI.PATH_STEP_SIZE, function (tile, length, stepSize) {
                                return Constants.AI.LASER_AIMER_THREAT_WEIGHT * stepSize;
                            });
                        }
                    }
                }
            }

            // Add zones to threat map.
            // FIXME Check when adding zone.
            const zones = this.gameController.getZones();
            for (const zoneId in zones) {
                const zone = zones[zoneId];
                switch(zone.getType()) {
                    case Constants.ZONE_TYPES.SPAWN:
                    {
                        const tiles = zone.getTiles();
                        for(let i = 0; i < tiles.length; ++i) {
                            this.threatMap.add(tiles[i], Constants.AI.SPAWN_ZONE_THREAT_WEIGHT);
                        }
                    }
                }
            }
        }

        if (this.stuckNow) {
            this.stuckTime += deltaTime;
        } else {
            this.stuckTime = 0;
        }
        this.stuckNow = false;

        const aggressivenessGrowth = MathUtils.linearInterpolation(Constants.AI.MIN_AGGRESSIVENESS_GROWTH, Constants.AI.MAX_AGGRESSIVENESS_GROWTH, this.config[AI._TRAITS.AGGRESSIVENESS]);
        this.currentAggressiveness = Math.min(this.config[AI._TRAITS.AGGRESSIVENESS], this.currentAggressiveness + aggressivenessGrowth * deltaTime);
        const greedinessGrowth = MathUtils.linearInterpolation(Constants.AI.MIN_GREEDINESS_GROWTH, Constants.AI.MAX_GREEDINESS_GROWTH, this.config[AI._TRAITS.GREEDINESS]);
        this.currentGreediness = Math.min(this.config[AI._TRAITS.GREEDINESS], this.currentGreediness + greedinessGrowth * deltaTime);
    },

    _reset: function() {
        this.goal = {type: AI._GOALS.IDLE, priority: Constants.AI.IDLE_PRIORITY, id: 0, period: 0};
        this.nextGoalId = 1;

        this.stuckNow = false;
        this.stuckTime = 0;
        this.stuckNormal = null;

        this.threatMap = null;
    },

    // Return target info object containing target (string) and priority (float)
    _getPreferredTarget: function(gameMode, tanks) {
        let target = null;
        let priority = 0;

        const killsToBeBlindedByRevenge = MathUtils.linearInterpolation(Constants.AI.MAX_KILLS_TO_BE_BLINDED_BY_REVENGE, Constants.AI.MIN_KILLS_TO_BE_BLINDED_BY_REVENGE, this.config[AI._TRAITS.VENGEFULNESS]);

        // Revenge target: The tank with most kills against us.
        let revengeTarget = null;
        let revengePriority = 0;
        let highestKillCount = 0;
        for (const tank in tanks) {
            let killCount = 0;
            for (let i = 0; i < this.kills.length; ++i) {
                const kill = this.kills[i];
                if (kill.getKillerPlayerId() == tank && kill.getVictimPlayerId() == this.aiId) {
                    ++killCount;
                }
            }
            if (killCount > highestKillCount) {
                revengeTarget = tank;
                highestKillCount = killCount;
            }
        }
        if (revengeTarget) {
            const revengeWeight = Math.min(1.0, highestKillCount / killsToBeBlindedByRevenge);
            revengePriority = MathUtils.linearInterpolation(Constants.AI.MIN_REVENGE_PRIORITY, Constants.AI.MAX_REVENGE_PRIORITY, revengeWeight);

            if (revengePriority > priority) {
                target = revengeTarget;
                priority = revengePriority;
            }
        }

        // Win target: The tank that is currently winning.
        let winTarget = null;
        let winPriority = 0;
        // FIXME Check when adding new game mode.
        switch(gameMode) {
            case Constants.GAME_MODES.DEATHMATCH:
            {
                // Go for the tank with most points.
                // FIXME Use mode.getWinnerPlayerIds()?
                let highestScore = 0;
                for (const tank in tanks) {
                    const score = this.gameController.getScoreByPlayerIdAndType(tank, Constants.SCORE_TYPES.KILL);
                    if (score) {
                        if (score.getValue() > highestScore) {
                            winTarget = tank;
                            highestScore = score.getValue();
                        }
                    }
                }
                break;
            }
        }
        if (winTarget) {
            winPriority = MathUtils.linearInterpolation(Constants.AI.MIN_WIN_PRIORITY, Constants.AI.MAX_WIN_PRIORITY, this.config[AI._TRAITS.CLEVERNESS]);

            if (winPriority > priority) {
                target = winTarget;
                priority = winPriority;
            }
        }

        return {target: target, priority: priority};
    },

    // Returns true if the goal is new or the current goal needs continuous updates of actions.
    _makeDecisionsAndUpdateGoal: function(deltaTime) {
        // A goal cannot be changed during its period.
        if (this.goal.period > 0) {
            this.goal.period -= deltaTime;
            return false;
        }

        // After its period, the goal's priority is decreased.
        this.goal.priority -= MathUtils.linearInterpolation(Constants.AI.MAX_PRIORITY_DECREASE, Constants.AI.MIN_PRIORITY_DECREASE, this.config[AI._TRAITS.DETERMINATION]) * deltaTime;

        const tank = this.gameController.getTank(this.aiId);
        if (tank === undefined) {
            return false;
        }

        const maze = this.gameController.getMaze();
        if (maze === undefined) {
            return false;
        }

        const tanks = this.gameController.getTanks();

        const projectiles = this.gameController.getProjectiles();

        const upgrades = this.gameController.getUpgrades();

        // Determine new goal.
        const currentGoal = this.goal;

        const defaultGoalPeriod = MathUtils.linearInterpolation(Constants.AI.MAX_GOAL_PERIOD, Constants.AI.MIN_GOAL_PERIOD, this.config[AI._TRAITS.CLEVERNESS]);

        const preferredTargetInfo = this._getPreferredTarget(this.gameController.getMode(), tanks);

        //---------------------------------------
        // Compute go for collectible priorities.
        //---------------------------------------
        const maxCrateDistanceToConsider = MathUtils.linearInterpolation(Constants.AI.MIN_CRATE_DISTANCE_TO_CONSIDER, Constants.AI.MAX_CRATE_DISTANCE_TO_CONSIDER, this.config[AI._TRAITS.CLEVERNESS]);
        const crateDistanceFalloff = MathUtils.linearInterpolation(Constants.AI.MAX_CRATE_DISTANCE_FALLOFF, Constants.AI.MIN_CRATE_DISTANCE_FALLOFF, this.currentGreediness);
        const cratePriorityOffset = MathUtils.linearInterpolation(Constants.AI.MIN_CRATE_PRIORITY_OFFSET, Constants.AI.MAX_CRATE_PRIORITY_OFFSET, this.config[AI._TRAITS.CLEVERNESS]);
        const numQueuedWeapons = this.gameController.getQueuedWeapons(this.aiId).length;
        if (numQueuedWeapons < Constants.MAX_WEAPON_QUEUE) {
            for (let i = 0; i < this.weaponCratePositions.length; ++i) {
                const crateDistance = maze.getDistanceBetweenPositions(this.myPosition, this.weaponCratePositions[i]);
                if (crateDistance !== false && crateDistance <= maxCrateDistanceToConsider) {
                    // FIXME Use getShortestPathWithGraph and take the length. Also, make sure to include limit on danger using boldness.
                    const cratePriority = (Math.max(0.0, 1.0 - crateDistance * crateDistanceFalloff) + cratePriorityOffset) / (1.0 + cratePriorityOffset);
                    const crateGoal = {type: AI._GOALS.PICK_UP_COLLECTIBLE, priority: cratePriority, id: this.nextGoalId++, period: defaultGoalPeriod, position: this.weaponCratePositions[i]};
                    this._updateGoal(crateGoal);
                }
            }
        }
        for (let i = 0; i < this.shieldCratePositions.length; ++i) {
            const crateDistance = maze.getDistanceBetweenPositions(this.myPosition, this.shieldCratePositions[i]);
            if (crateDistance !== false && crateDistance <= maxCrateDistanceToConsider) {
                // FIXME Use getShortestPathWithGraph and take the length. Also, make sure to include limit on danger using boldness.
                const cratePriority = (Math.max(0.0, 1.0 - crateDistance * crateDistanceFalloff) + cratePriorityOffset) / (1.0 + cratePriorityOffset);
                const crateGoal = {type: AI._GOALS.PICK_UP_COLLECTIBLE, priority: cratePriority, id: this.nextGoalId++, period: defaultGoalPeriod, position: this.shieldCratePositions[i]};
                this._updateGoal(crateGoal);
            }
        }
        const maxCurrencyDistanceToConsider = MathUtils.linearInterpolation(Constants.AI.MIN_CURRENCY_DISTANCE_TO_CONSIDER, Constants.AI.MAX_CURRENCY_DISTANCE_TO_CONSIDER, this.currentGreediness);
        const currencyDistanceFalloff = MathUtils.linearInterpolation(Constants.AI.MAX_CURRENCY_DISTANCE_FALLOFF, Constants.AI.MIN_CURRENCY_DISTANCE_FALLOFF, this.currentGreediness);
        for (let i = 0; i < this.goldPositions.length; ++i) {
            const goldDistance = maze.getDistanceBetweenPositions(this.myPosition, this.goldPositions[i]);
            if (goldDistance !== false && goldDistance <= maxCurrencyDistanceToConsider) {
                // FIXME Use getShortestPathWithGraph and take the length. Also, make sure to include limit on danger using boldness.
                const goldPriorityOffset = MathUtils.linearInterpolation(Constants.AI.MIN_GOLD_PRIORITY_OFFSET, Constants.AI.MAX_GOLD_PRIORITY_OFFSET, this.currentGreediness);
                const goldPriority = (Math.max(0.0, 1.0 - goldDistance * currencyDistanceFalloff) + goldPriorityOffset) / (1.0 + goldPriorityOffset);
                const crateGoal = {type: AI._GOALS.PICK_UP_COLLECTIBLE, priority: goldPriority, id: this.nextGoalId++, period: defaultGoalPeriod, position: this.goldPositions[i]};
                this._updateGoal(crateGoal);
            }
        }
        for (let i = 0; i < this.diamondPositions.length; ++i) {
            const diamondDistance = maze.getDistanceBetweenPositions(this.myPosition, this.diamondPositions[i]);
            if (diamondDistance !== false && diamondDistance <= maxCurrencyDistanceToConsider) {
                // FIXME Use getShortestPathWithGraph and take the length. Also, make sure to include limit on danger using boldness.
                const diamondPriorityOffset = MathUtils.linearInterpolation(Constants.AI.MIN_DIAMOND_PRIORITY_OFFSET, Constants.AI.MAX_DIAMOND_PRIORITY_OFFSET, this.currentGreediness);
                const diamondPriority = (Math.max(0.0, 1.0 - diamondDistance * currencyDistanceFalloff) + diamondPriorityOffset) / (1.0 + diamondPriorityOffset);
                const crateGoal = {type: AI._GOALS.PICK_UP_COLLECTIBLE, priority: diamondPriority, id: this.nextGoalId++, period: defaultGoalPeriod, position: this.diamondPositions[i]};
                this._updateGoal(crateGoal);
            }
        }

        //---------------------------------------
        // Compute dodge projectile priorities.
        //---------------------------------------
        const scaryProjectileDistance = MathUtils.linearInterpolation(Constants.AI.MAX_SCARY_PROJECTILE_DISTANCE, Constants.AI.MIN_SCARY_PROJECTILE_DISTANCE, this.config[AI._TRAITS.BOLDNESS]);
        const maxDodgeProjectileDistance = MathUtils.linearInterpolation(Constants.AI.MAX_DODGE_PROJECTILE_DISTANCE, Constants.AI.MIN_DODGE_PROJECTILE_DISTANCE, this.config[AI._TRAITS.BOLDNESS]);
        for(const projectilePath in this.projectilePaths) {
            if (AIUtils.checkProtected(this.aiId, this.gameController)) {
                continue;
            }
            const dodgeInfo = AIUtils.checkProjectilePathForDodging(tank, this.projectilePaths[projectilePath], projectiles[projectilePath], this.gameController.getB2DWorld(), scaryProjectileDistance * scaryProjectileDistance);
            const dodgeProjectilePriority = ((maxDodgeProjectileDistance - dodgeInfo.closestDistance) / maxDodgeProjectileDistance + Constants.AI.DODGE_PRIORITY_OFFSET) / (1.0 + Constants.AI.DODGE_PRIORITY_OFFSET);
            const dodgeGoal = {type: AI._GOALS.DODGE_PROJECTILE, priority: dodgeProjectilePriority, id: this.nextGoalId++, period: defaultGoalPeriod, dodgeInfo: dodgeInfo};
            this._updateGoal(dodgeGoal);
        }

        //---------------------------------------
        // Compute shoot after priority.
        //---------------------------------------
        const activeWeapon = this.gameController.getActiveWeapon(this.aiId);
        if (activeWeapon) {
            // FIXME Check when adding weapon.
            switch(activeWeapon.getType()) {
                case Constants.WEAPON_TYPES.BULLET:
                {
                    if (activeWeapon.getField("bulletsFired") < activeWeapon.getField("numBullets")) {
                        this._updateStandardShootAfterGoal(tanks, maze, defaultGoalPeriod, activeWeapon.getType(), preferredTargetInfo);
                    }
                    break;
                }
                case Constants.WEAPON_TYPES.LASER:
                case Constants.WEAPON_TYPES.DOUBLE_BARREL:
                {
                    this._updateStandardShootAfterGoal(tanks, maze, defaultGoalPeriod, activeWeapon.getType(), preferredTargetInfo);
                    break;
                }
                case Constants.WEAPON_TYPES.SHOTGUN:
                {
                    if (activeWeapon.getField("reloadTime") <= 0) {
                        this._updateStandardShootAfterGoal(tanks, maze, defaultGoalPeriod, activeWeapon.getType(), preferredTargetInfo);
                    }
                    break;
                }
                case Constants.WEAPON_TYPES.HOMING_MISSILE:
                {
                    if (!activeWeapon.getField("launched")) {
                        this._updateStandardShootAfterGoal(tanks, maze, defaultGoalPeriod, activeWeapon.getType(), preferredTargetInfo);
                    }
                    break;
                }
            }
        }

        //---------------------------------------
        // Compute run away priority.
        //---------------------------------------
        if (!AIUtils.checkProtected(this.aiId, this.gameController)) {
            // Check if out of ammo.
            const defaultWeapon = this.gameController.getDefaultWeapon(this.aiId);
            if (activeWeapon && defaultWeapon) {
                if (activeWeapon == defaultWeapon) {
                    // FIXME Check when adding weapon.
                    switch(activeWeapon.getType()) {
                        case Constants.WEAPON_TYPES.BULLET:
                        {
                            if (activeWeapon.getField("bulletsFired") == activeWeapon.getField("numBullets")) {
                                this._updateStandardRunAwayGoal(tanks, maze, defaultGoalPeriod);
                            }
                            break;
                        }
                        case Constants.WEAPON_TYPES.LASER:
                        {
                            if (activeWeapon.getField("fired")) {
                                this._updateStandardRunAwayGoal(tanks, maze, defaultGoalPeriod);
                            }
                            break;
                        }
                        case Constants.WEAPON_TYPES.DOUBLE_BARREL:
                        case Constants.WEAPON_TYPES.SHOTGUN:
                        {
                            if (activeWeapon.getField("numBullets") == 0) {
                                this._updateStandardRunAwayGoal(tanks, maze, defaultGoalPeriod);
                            }
                            break;
                        }
                        case Constants.WEAPON_TYPES.HOMING_MISSILE:
                        {
                            if (!activeWeapon.getField("launched")) {
                                this._updateStandardRunAwayGoal(tanks, maze, defaultGoalPeriod);
                            }
                            break;
                        }
                    }
                }
            }

            // Check if in enemy laser aimer path.
            const laserAimerDistance = MathUtils.linearInterpolation(Constants.AI.MAX_LASER_AIMER_DISTANCE, Constants.AI.MIN_LASER_AIMER_DISTANCE, this.config[AI._TRAITS.BOLDNESS]);
            for(const laserAimerPath in this.laserAimerPaths) {
                const dodgeInfo = AIUtils.checkAimerPathForDodging(tank, this.laserAimerPaths[laserAimerPath], upgrades[laserAimerPath], this.gameController.getB2DWorld());
                if (dodgeInfo.closestDistance < laserAimerDistance) {
                    this._updateStandardRunAwayGoal(tanks, maze, defaultGoalPeriod);
                }
            }

            // Check if all enemies are protected.
            let allProtected = true;
            for (const tank in tanks) {
                if (tank !== this.aiId) {
                    // FIXME Do not consider team mates!
                    if (!AIUtils.checkProtected(tank, this.gameController)) {
                        allProtected = false;
                        break;
                    }
                }
            }
            if (allProtected) {
                this._updateStandardRunAwayGoal(tanks, maze, defaultGoalPeriod);
            }
        }

        //---------------------------------------
        // Compute get unstuck priority.
        //---------------------------------------
        const getUnstuckPriority = Math.min(this.stuckTime / Constants.AI.MAX_STUCK_TIME, 1.0);
        this._updateGoal({type: AI._GOALS.GET_UNSTUCK, priority: getUnstuckPriority, id: this.nextGoalId++, period: Constants.AI.GET_UNSTUCK_GOAL_PERIOD, normal: this.stuckNormal});

        //---------------------------------------
        // Compute hunt priority.
        //---------------------------------------
        const maxTankDistanceToConsider = MathUtils.linearInterpolation(Constants.AI.MIN_TANK_HUNT_DISTANCE_TO_CONSIDER, Constants.AI.MAX_TANK_HUNT_DISTANCE_TO_CONSIDER, this.config[AI._TRAITS.CLEVERNESS]);
        for (const tank in tanks) {
            if (tank !== this.aiId) {
                // Ignore tanks with a shield.
                if (AIUtils.checkProtected(tank, this.gameController)) {
                    continue;
                }
                const tankDistance = maze.getDistanceBetweenPositions(this.myPosition, this.tankPositions[tank]);
                if (tankDistance !== false) {
                    // FIXME Use getShortestPathWithGraph and take the length. Also, make sure to include limit on danger using boldness.
                    const targetPriorityOffset = (tank == preferredTargetInfo.target ? preferredTargetInfo.priority : 0);
                    const huntPriority = ((maxTankDistanceToConsider - tankDistance) / maxTankDistanceToConsider + targetPriorityOffset) / (1.0 + targetPriorityOffset) * Constants.AI.MAX_HUNT_PRIORITY;
                    const huntGoal = {type: AI._GOALS.HUNT, priority: huntPriority, id: this.nextGoalId++, period: defaultGoalPeriod, position: this.tankPositions[tank]};
                    this._updateGoal(huntGoal);
                }
            }
        }

        //---------------------------------------
        // Compute idle priority.
        //---------------------------------------
        this._updateGoal({type: AI._GOALS.IDLE, priority: Constants.AI.IDLE_PRIORITY, id: this.nextGoalId++, period: defaultGoalPeriod});

        if (currentGoal.id !== this.goal.id) {
            //console.log(this.goal.type + " " + this.goal.priority);
            return true;
        }

        return false;
    },

    _updateGoal: function(potentialNewGoal) {
        //console.log("Consider: " + potentialNewGoal.type + " " + potentialNewGoal.priority);
        if (potentialNewGoal.priority > this.goal.priority) {
            this.goal = potentialNewGoal;
        }
    },

    _updateStandardShootAfterGoal: function(tanks, maze, period, weaponType, preferredTargetInfo) {
        const maxTankDistanceToConsider = MathUtils.linearInterpolation(Constants.AI.MIN_TANK_TARGET_DISTANCE_TO_CONSIDER, Constants.AI.MAX_TANK_TARGET_DISTANCE_TO_CONSIDER, this.config[AI._TRAITS.CLEVERNESS]);
        const shootAfterPriorityOffset = MathUtils.linearInterpolation(Constants.AI.MIN_SHOOT_AFTER_PRIORITY_OFFSET, Constants.AI.MAX_SHOOT_AFTER_PRIORITY_OFFSET, this.currentAggressiveness);
        for (const tank in tanks) {
            if (tank !== this.aiId) {
                // FIXME Do not consider team mates!
                // Ignore tanks with a shield.
                if (AIUtils.checkProtected(tank, this.gameController)) {
                    continue;
                }
                const tankDistance = maze.getDistanceBetweenPositions(this.myPosition, this.tankPositions[tank]);
                if (tankDistance !== false && tankDistance < maxTankDistanceToConsider) {
                    const targetPriorityOffset = (tank == preferredTargetInfo.target ? preferredTargetInfo.priority : 0);
                    const shootAfterPriority = ((maxTankDistanceToConsider - tankDistance) / maxTankDistanceToConsider + shootAfterPriorityOffset + targetPriorityOffset) / (1.0 + shootAfterPriorityOffset + targetPriorityOffset);
                    const shootAfterGoal = {type: AI._GOALS.SHOOT_AFTER, priority: shootAfterPriority, id: this.nextGoalId++, period: period, target: tank, weaponType: weaponType, preferredTargetInfo: preferredTargetInfo};
                    this._updateGoal(shootAfterGoal);
                }
            }
        }
    },

    _updateStandardRunAwayGoal: function(tanks, maze, period) {
        // Combine distances from all tanks.
        const distances = [];
        let avgDistance = 0;
        for (const tank in tanks) {
            if (tank !== this.aiId) {
                // FIXME Do not consider team mates!
                const tankDistance = maze.getDistanceBetweenPositions(this.myPosition, this.tankPositions[tank]);
                if (tankDistance !== false) {
                    distances.push(maze.getDistancesFromPosition(this.tankPositions[tank]));
                    avgDistance += tankDistance;
                }
            }
        }
        if (distances.length > 0) {
            avgDistance /= distances.length;
            const maxDistanceToConsider = MathUtils.linearInterpolation(Constants.AI.MIN_RUN_AWAY_DISTANCE_TO_CONSIDER, Constants.AI.MAX_RUN_AWAY_DISTANCE_TO_CONSIDER, this.config[AI._TRAITS.CLEVERNESS]);
            const runAwayPriorityOffset = MathUtils.linearInterpolation(Constants.AI.MAX_RUN_AWAY_PRIORITY_OFFSET, Constants.AI.MIN_RUN_AWAY_PRIORITY_OFFSET, this.config[AI._TRAITS.BOLDNESS]);
            const runAwayPriority = ((maxDistanceToConsider - avgDistance) / maxDistanceToConsider + runAwayPriorityOffset) / (1.0 + runAwayPriorityOffset);
            const runAwayGoal = {type: AI._GOALS.RUN_AWAY, priority: runAwayPriority, id: this.nextGoalId++, period: period, distances: distances};
            this._updateGoal(runAwayGoal);
        }
    },

    _tryToRetaliate: function(tank) {
        const activeWeapon = this.gameController.getActiveWeapon(this.aiId);
        const tanks = this.gameController.getTanks();
        if (activeWeapon) {
            const firingPathBounces = Math.ceil(MathUtils.linearInterpolation(Constants.AI.MIN_FIRING_PATH_BOUNCES, Constants.AI.MAX_FIRING_PATH_BOUNCES, this.config[AI._TRAITS.CLEVERNESS]));
            const firingPathLength = MathUtils.linearInterpolation(Constants.AI.MIN_FIRING_PATH_LENGTH, Constants.AI.MAX_FIRING_PATH_LENGTH, this.config[AI._TRAITS.CLEVERNESS]);
            const closestDistanceToRetaliate = MathUtils.linearInterpolation(Constants.AI.MIN_DISTANCE_TO_RETALIATE, Constants.AI.MAX_DISTANCE_TO_RETALIATE, this.config[AI._TRAITS.AGGRESSIVENESS]);
            const reactionDelay = MathUtils.linearInterpolation(Constants.AI.MAX_RETALIATE_DELAY, 0, this.config[AI._TRAITS.DEXTERITY]);
            let firingInfo = null;
            // FIXME Check when adding weapon.
            switch(activeWeapon.getType()) {
                case Constants.WEAPON_TYPES.BULLET:
                {
                    if (activeWeapon.getField("bulletsFired") < activeWeapon.getField("numBullets")) {
                        firingInfo = AIUtils.checkFiringPath(tank, tanks, this.gameController, 0, firingPathBounces, Constants.MAZE_TILE_SIZE.m * firingPathLength, activeWeapon.getType());
                    }
                    break;
                }
                case Constants.WEAPON_TYPES.LASER:
                case Constants.WEAPON_TYPES.DOUBLE_BARREL:
                {
                    firingInfo = AIUtils.checkFiringPath(tank, tanks, this.gameController, 0, firingPathBounces, Constants.MAZE_TILE_SIZE.m * firingPathLength, activeWeapon.getType());
                    break;
                }
                case Constants.WEAPON_TYPES.SHOTGUN:
                {
                    if (activeWeapon.getField("reloadTime") <= 0) {
                        firingInfo = AIUtils.checkFiringPath(tank, tanks, this.gameController, 0, firingPathBounces, Constants.MAZE_TILE_SIZE.m * firingPathLength, activeWeapon.getType());
                    }
                    break;
                }
                case Constants.WEAPON_TYPES.HOMING_MISSILE:
                {
                    if (!activeWeapon.getField("launched")) {
                        firingInfo = AIUtils.checkFiringPath(tank, tanks, this.gameController, 0, firingPathBounces, Constants.MAZE_TILE_SIZE.m * firingPathLength, activeWeapon.getType());
                    }
                    break;
                }
            }
            if (firingInfo) {
                if (firingInfo.result === AIUtils._FIRING_RESULTS.HIT) {
                    this.actions.unshift({type: AI._ACTIONS.FIRE, duration: 1, delay: reactionDelay});

                    this.currentAggressiveness = Math.max(0, this.currentAggressiveness - Constants.AI.AGGRESSIVENESS_RETALIATE_SHRINKAGE);
                } else if (firingInfo.result === AIUtils._FIRING_RESULTS.NEAR) {
                    if (firingInfo.closestDistance < closestDistanceToRetaliate) {
                        this.actions.unshift({type: AI._ACTIONS.FIRE, duration: 1, delay: reactionDelay});

                        this.currentAggressiveness = Math.max(0, this.currentAggressiveness - Constants.AI.AGGRESSIVENESS_RETALIATE_SHRINKAGE);
                    }
                }
            }
        }
    },

    _updateActionsToAchieveGoal: function() {
        this.actions = [];

        const tank = this.gameController.getTank(this.aiId);
        if (!tank) {
            return;
        }

        switch(this.goal.type) {
            case AI._GOALS.SHOOT_AFTER:
            {
                this.currentAggressiveness = Math.max(0, this.currentAggressiveness - Constants.AI.AGGRESSIVENESS_SHOOT_AFTER_SHRINKAGE);

                const target = this.gameController.getTank(this.goal.target);
                if (target) {
                    const tankPosition = {x: tank.getX(), y: tank.getY()};
                    const targetPosition = {x: target.getX(), y: target.getY()};
                    const imprecision = MathUtils.randomAroundZero(MathUtils.linearInterpolation(Constants.AI.MAX_ROTATION_IMPRECISION, 0, this.config[AI._TRAITS.DEXTERITY]));
                    const reactionDelay = MathUtils.linearInterpolation(Constants.AI.MAX_FIRE_DELAY, 0, this.config[AI._TRAITS.DEXTERITY]);
                    // First check if we can make a direct hit.
                    if (!B2DUtils.checkLineForMazeCollision(this.gameController.getB2DWorld(), tankPosition, targetPosition)) {
                        const direction = {x: targetPosition.x - tankPosition.x, y: targetPosition.y - tankPosition.y};
                        this.actions.push({type: AI._ACTIONS.TURN_TO, direction: direction, imprecision: imprecision});
                        this.actions.push({type: AI._ACTIONS.FIRE, duration: 1, delay: reactionDelay});
                    } else {
                        // Then check a few angles for bounce shots - include all tanks in this search.
                        const tanks = this.gameController.getTanks();
                        const firingPathBounces = Math.ceil(MathUtils.linearInterpolation(Constants.AI.MIN_FIRING_PATH_BOUNCES, Constants.AI.MAX_FIRING_PATH_BOUNCES, this.config[AI._TRAITS.CLEVERNESS]));
                        // FIXME Possibly modify firingPathLength based on weapon type.
                        const firingPathLength = MathUtils.linearInterpolation(Constants.AI.MIN_FIRING_PATH_LENGTH, Constants.AI.MAX_FIRING_PATH_LENGTH, this.config[AI._TRAITS.CLEVERNESS]);
                        let numFiringPathsToCheck = Math.ceil(MathUtils.linearInterpolation(Constants.AI.MIN_NUM_FIRING_PATHS, Constants.AI.MAX_NUM_FIRING_PATHS, this.config[AI._TRAITS.CLEVERNESS]));
                        // Always make sure that num firing paths is odd. This ensures that we check the direction we're facing.
                        numFiringPathsToCheck += (numFiringPathsToCheck + 1) % 2;
                        const firingPathSpread = MathUtils.linearInterpolation(Constants.AI.MIN_FIRING_PATH_SPREAD, Constants.AI.MAX_FIRING_PATH_SPREAD, this.config[AI._TRAITS.AGGRESSIVENESS]);
                        const minAngle = -firingPathSpread * 0.5;
                        const angleStep = firingPathSpread / (numFiringPathsToCheck - 1);
                        let closestDistance = Number.MAX_VALUE;
                        let shortestLength = Number.MAX_VALUE;
                        let targetDirection = null;
                        let preferredClosestDistance = Number.MAX_VALUE;
                        let preferredShortestLength = Number.MAX_VALUE;
                        let preferredTargetDirection = null;
                        for (let i = 0; i < numFiringPathsToCheck; ++i) {
                            // Add some random offset to direction.
                            const angle = minAngle + i * angleStep + MathUtils.randomAroundZero(Constants.AI.FIRING_PATH_RANDOM_OFFSET);
                            const firingInfo = AIUtils.checkFiringPath(tank, tanks, this.gameController, angle, firingPathBounces, Constants.MAZE_TILE_SIZE.m * firingPathLength, this.goal.weaponType);
                            if (firingInfo.result === AIUtils._FIRING_RESULTS.HIT) {
                                if (firingInfo.pathLength < shortestLength) {
                                    shortestLength = firingInfo.pathLength;
                                    closestDistance = 0;
                                    targetDirection = firingInfo.direction;
                                }
                                // Keep separate tabs on the preferred target.
                                if (this.goal.preferredTargetInfo.target) {
                                    if (this.goal.preferredTargetInfo.target === firingInfo.target) {
                                        if (firingInfo.pathLength < preferredShortestLength) {
                                            preferredShortestLength = firingInfo.pathLength;
                                            preferredClosestDistance = 0;
                                            preferredTargetDirection = firingInfo.direction;
                                        }
                                    }
                                }
                            } else if (firingInfo.result === AIUtils._FIRING_RESULTS.NEAR) {
                                if (firingInfo.closestDistance < closestDistance) {
                                    closestDistance = firingInfo.closestDistance;
                                    targetDirection = firingInfo.direction;
                                }
                                // Keep separate tabs on the preferred target.
                                if (this.goal.preferredTargetInfo.target) {
                                    if (this.goal.preferredTargetInfo.target === firingInfo.target) {
                                        if (firingInfo.closestDistance < preferredClosestDistance) {
                                            preferredClosestDistance = firingInfo.closestDistance;
                                            preferredTargetDirection = firingInfo.direction;
                                        }
                                    }
                                }
                            }
                        }

                        // Figure out if going for preferred target or not.
                        const closestPreferredDistanceOffset = MathUtils.linearInterpolation(Constants.AI.MIN_PREFERRED_CLOSEST_DISTANCE_OFFSET, Constants.MAX_PREFERRED_CLOSEST_DISTANCE_OFFSET, this.config[AI._TRAITS.CLEVERNESS]);
                        if (preferredClosestDistance - closestPreferredDistanceOffset <= closestDistance) {
                            closestDistance = preferredClosestDistance;
                            targetDirection = preferredTargetDirection;
                        }

                        // FIXME Possibly modify closestDistanceToFire based on weapon type.
                        const closestDistanceToFire = MathUtils.linearInterpolation(Constants.AI.MIN_DISTANCE_TO_FIRE, Constants.AI.MAX_DISTANCE_TO_FIRE, this.config[AI._TRAITS.AGGRESSIVENESS]);
                        if (closestDistance < closestDistanceToFire) {
                            // We found a direct hit or something close enough.
                            this.actions.push({type: AI._ACTIONS.TURN_TO, direction: targetDirection, imprecision: imprecision});
                            this.actions.push({type: AI._ACTIONS.FIRE, duration: 1, delay: reactionDelay});
                        } else if (targetDirection) {
                            // We found some direction where there was a near shot. Try turning to that direction.
                            this.actions.push({type: AI._ACTIONS.TURN_TO, direction: targetDirection, imprecision: imprecision});
                        } else {
                            // We found nothing but suicide or miss shots so try turning around.
                            const angle = MathUtils.randomSign(MathUtils.randomRange(Constants.AI.MIN_TURN_AROUND_ANGLE, Constants.AI.MAX_TURN_AROUND_ANGLE));
                            const directionX = Math.sin(tank.getRotation() + angle); // Normally it would be Math.cos(rotation), but the tank graphics is rotated 90 degrees CCW
                            const directionY = -Math.cos(tank.getRotation() + angle); // Normally it would be Math.sin(rotation), but the tank graphics is rotated 90 degrees CCW
                            this.actions.push({type: AI._ACTIONS.TURN_TO, direction: {x: directionX, y: directionY}, imprecision: imprecision});
                        }
                    }
                }

                break;
            }
            case AI._GOALS.DODGE_PROJECTILE:
            {
                const escapePathLength = Math.ceil(MathUtils.linearInterpolation(Constants.AI.MIN_ESCAPE_PATH_LENGTH, Constants.AI.MAX_ESCAPE_PATH_LENGTH, this.config[AI._TRAITS.CLEVERNESS]));
                const deadEndWeight = MathUtils.linearInterpolation(Constants.AI.MIN_PATH_DEAD_END_WEIGHT, Constants.AI.MAX_PATH_DEAD_END_WEIGHT, this.config[AI._TRAITS.CLEVERNESS]);
                const threatWeight = MathUtils.linearInterpolation(Constants.AI.MAX_PATH_THREAT_WEIGHT, Constants.AI.MIN_PATH_THREAT_WEIGHT, this.config[AI._TRAITS.BOLDNESS]);

                if (this.myPosition && this.projectilePositions[this.goal.dodgeInfo.closestId]) {
                    const maze = this.gameController.getMaze();
                    const escapePath = maze.getPathAwayFromWithThreats(this.myPosition, this.projectilePositions[this.goal.dodgeInfo.closestId], escapePathLength, deadEndWeight, this.threatMap, threatWeight);
                    // If the projectile is really close in time and space, drive to a position next to it and align with the direction.
                    // If there is no escape path, do the same.
                    if ((this.goal.dodgeInfo.closestTime < Constants.AI.TIME_TO_DODGE && this.goal.dodgeInfo.closestDistance < Constants.AI.DISTANCE_TO_DODGE) || escapePath.length == 0) {
                        // Determine position and direction.
                        const closestDirection = this.goal.dodgeInfo.closestDirection;
                        const closestPosition = this.goal.dodgeInfo.closestPosition;
                        const imprecision = MathUtils.randomAroundZero(MathUtils.linearInterpolation(Constants.AI.MAX_ROTATION_IMPRECISION, 0, this.config[AI._TRAITS.DEXTERITY]));
                        if (this.goal.dodgeInfo.closestDistance < Constants.AI.AMOUNT_TO_DODGE) {
                            const directionLength = Math.sqrt(closestDirection.x * closestDirection.x + closestDirection.y * closestDirection.y);
                            const tangent = {x: -closestDirection.y / directionLength * Constants.AI.AMOUNT_TO_DODGE, y: closestDirection.x / directionLength * Constants.AI.AMOUNT_TO_DODGE};
                            const closestPlusTangent = {x: closestPosition.x + tangent.x, y: closestPosition.y + tangent.y};
                            const closestMinusTangent = {x: closestPosition.x - tangent.x, y: closestPosition.y - tangent.y};
                            let distancePlusSquared = (tank.getX() - closestPlusTangent.x) * (tank.getX() - closestPlusTangent.x) + (tank.getY() - closestPlusTangent.y) + (tank.getY() - closestPlusTangent.y);
                            let distanceMinusSquared = (tank.getX() - closestMinusTangent.x) * (tank.getX() - closestMinusTangent.x) + (tank.getY() - closestMinusTangent.y) + (tank.getY() - closestMinusTangent.y);
                            // If tangent-offset position is inside maze wall, do not prioritize it.
                            const tankPosition = {x: tank.getX(), y: tank.getY()};
                            if (B2DUtils.checkLineForMazeCollision(this.gameController.getB2DWorld(), tankPosition, closestPlusTangent)) {
                                distancePlusSquared += Constants.AI.AMOUNT_TO_DODGE * Constants.AI.AMOUNT_TO_DODGE;
                            }
                            if (B2DUtils.checkLineForMazeCollision(this.gameController.getB2DWorld(), tankPosition, closestMinusTangent)) {
                                distanceMinusSquared += Constants.AI.AMOUNT_TO_DODGE * Constants.AI.AMOUNT_TO_DODGE;
                            }
                            if (distancePlusSquared < distanceMinusSquared) {
                                this.actions.push({type: AI._ACTIONS.DRIVE_TO_POSITION, position: closestPlusTangent, canReverse: true, imprecision: imprecision});
                            } else {
                                this.actions.push({type: AI._ACTIONS.DRIVE_TO_POSITION, position: closestMinusTangent, canReverse: true, imprecision: imprecision});
                            }
                        }

                        const relativeToTank = B2DUtils.directionToLocalSpace(tank.getB2DBody(), closestDirection);
                        // If projectile is moving in my forward direction, turn towards the same direction as it will be shorter.
                        // Otherwise, turn to its opposite direction, as that will be shorter.
                        if (relativeToTank.y < 0) {
                            this.actions.push({type: AI._ACTIONS.TURN_TO, direction: closestDirection, imprecision: imprecision});
                        } else {
                            this.actions.push({type: AI._ACTIONS.TURN_TO, direction: {x: -closestDirection.x, y: -closestDirection.y}, imprecision: imprecision});
                        }
                    } else {
                        this.actions = AIUtils.getActionsToFollowPath(escapePath, null, AI._ACTIONS.DRIVE_TO_TILE, AI._ACTIONS.DRIVE_TO_POSITION, this.config[AI._TRAITS.DEXTERITY]);
                    }
                    //Check if it makes sense to fire a shot in the direction we're facing.
                    this._tryToRetaliate(tank);
                }
                break;
            }
            case AI._GOALS.PICK_UP_COLLECTIBLE:
            {
                this.currentGreediness = Math.max(0, this.currentGreediness - Constants.AI.GREEDINESS_PICK_UP_COLLECTIBLE_SHRINKAGE);

                const targetPosition = this.goal.position;

                if (this.myPosition && targetPosition) {
                    const maze = this.gameController.getMaze();
                    const path = maze.getShortestPathWithGraph(this.myPosition, targetPosition, this.threatMap.data(), 0.1);
                    this.actions = AIUtils.getActionsToFollowPath(path, targetPosition, AI._ACTIONS.DRIVE_TO_TILE, AI._ACTIONS.DRIVE_TO_POSITION, this.config[AI._TRAITS.DEXTERITY]);
                }
                break;
            }
            case AI._GOALS.GET_UNSTUCK:
            {
                const stuckNormal = this.goal.normal;
                const targetPosition = {
                    x: tank.getX() - stuckNormal.x * Constants.AI.GET_UNSTUCK_DISTANCE,
                    y: tank.getY() - stuckNormal.y * Constants.AI.GET_UNSTUCK_DISTANCE
                };
                const imprecision = MathUtils.randomAroundZero(MathUtils.linearInterpolation(Constants.AI.MAX_ROTATION_IMPRECISION, 0, this.config[AI._TRAITS.DEXTERITY]));
                this.actions.push({type: AI._ACTIONS.DRIVE_TO_POSITION, position: targetPosition, canReverse: true, imprecision: imprecision});
                break;
            }
            case AI._GOALS.RUN_AWAY:
            {
                const distances = this.goal.distances;

                const escapePathLength = Math.ceil(MathUtils.linearInterpolation(Constants.AI.MIN_ESCAPE_PATH_LENGTH, Constants.AI.MAX_ESCAPE_PATH_LENGTH, this.config[AI._TRAITS.CLEVERNESS]));
                const deadEndWeight = MathUtils.linearInterpolation(Constants.AI.MIN_PATH_DEAD_END_WEIGHT, Constants.AI.MAX_PATH_DEAD_END_WEIGHT, this.config[AI._TRAITS.CLEVERNESS]);
                const threatWeight = MathUtils.linearInterpolation(Constants.AI.MAX_PATH_THREAT_WEIGHT, Constants.AI.MIN_PATH_THREAT_WEIGHT, this.config[AI._TRAITS.BOLDNESS]);

                const maze = this.gameController.getMaze();
                if (this.myPosition) {
                    const path = maze.getPathAwayWithMultipleDistancesAndThreats(this.myPosition, escapePathLength, deadEndWeight, distances, this.threatMap, threatWeight);
                    this.actions = AIUtils.getActionsToFollowPath(path, null, AI._ACTIONS.DRIVE_TO_TILE, AI._ACTIONS.DRIVE_TO_POSITION, this.config[AI._TRAITS.DEXTERITY]);
                }
                //Check if it makes sense to fire a shot in the direction we're facing.
                this._tryToRetaliate(tank);

                break;
            }
            case AI._GOALS.HUNT:
            {
                const targetPosition = this.goal.position;

                if (this.myPosition && targetPosition) {
                    const maze = this.gameController.getMaze();
                    const path = maze.getShortestPathWithGraph(this.myPosition, targetPosition, this.threatMap.data(), 0.1);
                    this.actions = AIUtils.getActionsToFollowPath(path, targetPosition, AI._ACTIONS.DRIVE_TO_TILE, AI._ACTIONS.DRIVE_TO_POSITION, this.config[AI._TRAITS.DEXTERITY]);
                }

                break;
            }
            case AI._GOALS.IDLE:
            {
                // Do something random - including idling.
                const randomAction = Math.floor(Math.random() * 3);
                switch(randomAction) {
                    case 0:
                    {
                        this.actions.push({type: AI._ACTIONS.IDLE, duration: MathUtils.randomRange(Constants.AI.MIN_IDLE_DURATION, Constants.AI.MAX_IDLE_DURATION)});
                        break;
                    }
                    case 1:
                    {
                        const angle = MathUtils.randomRange(0, 2 * Math.PI);
                        const directionX = Math.sin(angle); // Normally it would be Math.cos(rotation), but the tank graphics is rotated 90 degrees CCW
                        const directionY = -Math.cos(angle); // Normally it would be Math.sin(rotation), but the tank graphics is rotated 90 degrees CCW
                        const imprecision = MathUtils.randomAroundZero(MathUtils.linearInterpolation(Constants.AI.MAX_ROTATION_IMPRECISION, 0, this.config[AI._TRAITS.DEXTERITY]));
                        this.actions.push({type: AI._ACTIONS.TURN_TO, direction: {x: directionX, y: directionY}, imprecision: imprecision});
                        break;
                    }
                    case 2:
                    {
                        const maze = this.gameController.getMaze();
                        const targetPosition = maze.getRandomUnusedPosition(this.gameController.getRoundState(), Constants.AI.MIN_IDLE_DISTANCE);
                        if (this.myPosition && targetPosition) {
                            targetPosition.x = Math.floor(targetPosition.x / Constants.MAZE_TILE_SIZE.m);
                            targetPosition.y = Math.floor(targetPosition.y / Constants.MAZE_TILE_SIZE.m);
                            const path = maze.getShortestPathWithGraph(this.myPosition, targetPosition, this.threatMap.data(), 0.1);
                            this.actions = AIUtils.getActionsToFollowPath(path, targetPosition, AI._ACTIONS.DRIVE_TO_TILE, AI._ACTIONS.DRIVE_TO_POSITION, this.config[AI._TRAITS.DEXTERITY]);
                        }
                        break;
                    }
                }
            }
        }
    },

    _updateInputToDoAction: function() {
        this.inputState = InputState.withState(this.aiId, false, false, false, false, false);

        if (this.actions.length == 0) {
            return;
        }

        const tank = this.gameController.getTank(this.aiId);
        if (!tank) {
            return;
        }

        const action = this.actions[0];

        switch(action.type) {
            case AI._ACTIONS.DRIVE_TO_TILE:
            {
                const targetPosition = {
                    x: (action.position.x + 0.5) * Constants.MAZE_TILE_SIZE.m,
                    y: (action.position.y + 0.5) * Constants.MAZE_TILE_SIZE.m
                };

                this.inputState = AIUtils.getInputToDriveToPosition(tank, targetPosition, action.canReverse, action.imprecision);

                break;
            }
            case AI._ACTIONS.DRIVE_TO_POSITION:
            {
                this.inputState = AIUtils.getInputToDriveToPosition(tank, action.position, action.canReverse, action.imprecision);

                break;
            }
            case AI._ACTIONS.TURN_TO:
            {
                this.inputState = AIUtils.getInputToTurnToDirection(tank, action.direction, action.imprecision);
                break;
            }
            case AI._ACTIONS.FIRE:
            {
                this.inputState = AIUtils.getInputToFire(tank, action.delay);
                break;
            }
            case AI._ACTIONS.IDLE:
            default:
            {
                break;
            }
        }
    },

    _updateAndRemovePerformedActions: function(deltaTime) {
        if (this.actions.length == 0) {
            return;
        }

        const tank = this.gameController.getTank(this.aiId);
        if (!tank) {
            return;
        }

        const action = this.actions[0];

        switch(action.type) {
            case AI._ACTIONS.DRIVE_TO_TILE:
            {
                const targetPosition = {
                    x: (action.position.x + 0.5) * Constants.MAZE_TILE_SIZE.m,
                    y: (action.position.y + 0.5) * Constants.MAZE_TILE_SIZE.m
                };

                const diffSqr = (tank.getX() - targetPosition.x) * (tank.getX() - targetPosition.x) + (tank.getY() - targetPosition.y) * (tank.getY() - targetPosition.y);
                if (diffSqr < Constants.AI.DRIVE_TO_TILE_DISTANCE_SQUARED) {
                    this.actions.shift();
                }

                break;
            }
            case AI._ACTIONS.DRIVE_TO_POSITION:
            {
                const diffSqr = (tank.getX() - action.position.x) * (tank.getX() - action.position.x) + (tank.getY() - action.position.y) * (tank.getY() - action.position.y);
                if (diffSqr < Constants.AI.DRIVE_TO_POSITION_DISTANCE_SQUARED) {
                    this.actions.shift();
                }

                break;
            }
            case AI._ACTIONS.TURN_TO:
            {
                const relativeToTank = B2DUtils.directionToLocalSpace(tank.getB2DBody(), action.direction);
                if (Math.abs(Math.atan2(relativeToTank.y, relativeToTank.x) + Math.PI * 0.5 + action.imprecision) < Constants.AI.TURN_TO_DIFFERENCE)
                {
                    this.actions.shift();
                }

                break;
            }
            case AI._ACTIONS.FIRE:
            {
                if (action.delay <= 0) {
                    if (action.duration <= 0) {
                        this.actions.shift();
                    }
                    action.duration -= deltaTime;
                }
                action.delay -= deltaTime;
                break;
            }
            case AI._ACTIONS.IDLE:
            {
                if (action.duration <= 0) {
                    this.actions.shift();
                }
                action.duration -= deltaTime;
                break;
            }
            default:
            {
                break;
            }
        }
    }
});

AI.classFields({
    _TRAITS: {
        AGGRESSIVENESS: "aggressiveness",
        VENGEFULNESS: "vengefulness",
        CLEVERNESS: "cleverness",
        GREEDINESS: "greediness",
        BOLDNESS: "boldness",
        DETERMINATION: "determination",
        INSANITY: "insanity", // Unused. Shuffles goal priority?
        CHATTINESS: "chattiness", // Unused.
        DEXTERITY: "dexterity"
    },
    _GOALS: {
        SHOOT_AFTER: "shoot after",
        PICK_UP_COLLECTIBLE: "pick up collectible",
        DODGE_PROJECTILE: "dodge projectile",
        GET_UNSTUCK: "get unstuck",
        RUN_AWAY: "run away",
        HUNT: "hunt",
        IDLE: "idle"
    },
    _ACTIONS: {
        DRIVE_TO_TILE: "drive to tile",
        DRIVE_TO_POSITION: "drive to position",
        TURN_TO: "turn to",
        FIRE: "fire",
        IDLE: "idle"
    },
    _EVENTS: {
        GOAL_UPDATED: "goal updated" // Unused for now.
    }
});

if (typeof module === 'object') {
    module.exports = AI;
}
