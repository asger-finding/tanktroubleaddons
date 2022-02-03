if (typeof require === 'function') {
    var Classy = require('./classy');
    var Constants = require('./constants');
    var B2DUtils = require('./b2dutils');
    var InputState = require('./inputstate');
    var MathUtils = require('./mathutils');
}

const AIUtils = Classy.newClass();

AIUtils.classMethods({
    checkProtected: function(tankId, gameController) {
        // FIXME Check when adding upgrade or weapon.
        const spawnShieldUpgrade = gameController.getUpgradeByPlayerIdAndType(tankId, Constants.UPGRADE_TYPES.SPAWN_SHIELD);
        const shieldUpgrade = gameController.getUpgradeByPlayerIdAndType(tankId, Constants.UPGRADE_TYPES.SHIELD);

        if ((spawnShieldUpgrade && !spawnShieldUpgrade.getField("weakened")) ||
            (shieldUpgrade && !shieldUpgrade.getField("weakened"))) {
            return true;
        }
        return false;
    },

    // Returns dodge info object containing closestId (string), closestDistance (float), closestPosition ({x,y}), closestDirection ({x,y}) and closestTime (float)
    checkProjectilePathForDodging: function(tank, path, projectile, b2dWorld, scaryProjectileDistanceSquared) {
        const projectileSpeed = projectile.getB2DBody().GetLinearVelocity().Length();
        return this._checkPathForDodging(tank, path, projectileSpeed, projectile.getId(), b2dWorld, scaryProjectileDistanceSquared);
    },

    // Returns dodge info object containing closestId (string), closestDistance (float), closestPosition ({x,y}), closestDirection ({x,y}) and closestTime (float)
    checkAimerPathForDodging: function(tank, path, aimer, b2dWorld) {
        return this._checkPathForDodging(tank, path, 1, aimer.getId(), b2dWorld, Number.MAX_VALUE);
    },

    // Returns dodge info object containing closestId (string), closestDistance (float), closestPosition ({x,y}), closestDirection ({x,y}) and closestTime (float)
    _checkPathForDodging: function(tank, path, speed, id, b2dWorld, scaryDistanceSquared) {
        let closestDistanceSquared = Number.MAX_VALUE;
        let closestPosition = {x: 0, y: 0};
        let closestDirection = {x: 0, y: 0};
        let closestTime = Number.MAX_VALUE;
        let closestId = "";

        const tankPosition = {x: tank.getX(), y: tank.getY()};
        let previousTime = 0;
        for (let i = 0; i < path.length - 1; ++i) {
            // For each segment of path, find closest point.
            const segmentStartX = path[i].x;
            const segmentStartY = path[i].y;
            const segmentEndX = path[i + 1].x;
            const segmentEndY = path[i + 1].y;
            let diffSegmentX = segmentEndX - segmentStartX;
            let diffSegmentY = segmentEndY - segmentStartY;
            const diffSegmentLength = Math.sqrt(diffSegmentX * diffSegmentX + diffSegmentY * diffSegmentY);
            // Normalize segment length to be able to use t directly as a time measure.
            const segmentTime = diffSegmentLength / speed;
            diffSegmentX /= segmentTime;
            diffSegmentY /= segmentTime;
            const diffTankX = tankPosition.x - segmentStartX;
            const diffTankY = tankPosition.y - segmentStartY;
            let t = (diffTankX * diffSegmentX + diffTankY * diffSegmentY) / (speed * speed);
            if (t >= 0) { // Ignore if closest in the past.
                // Clamp the closest point to be the bounce. Add a small margin to ensure following collision test does not fail.
                t = Math.min(Math.max(t, Constants.PATH_MIN_STEP_LENGTH), segmentTime - Constants.PATH_MIN_STEP_LENGTH);
                const position = {x: segmentStartX + t * diffSegmentX, y: segmentStartY + t * diffSegmentY};
                // Check if closest point is blocked by maze.
                if (!B2DUtils.checkLineForMazeCollision(b2dWorld, position, tankPosition)) {
                    const distanceSquared = (tankPosition.x - position.x) * (tankPosition.x - position.x) + (tankPosition.y - position.y) * (tankPosition.y - position.y);
                    if (distanceSquared < closestDistanceSquared) {
                        closestDistanceSquared = distanceSquared;
                        closestPosition = position;
                        closestDirection = {x: diffSegmentX, y: diffSegmentY};
                        closestTime = previousTime + t;
                        closestId = id;
                    }
                }
            }

            previousTime += segmentTime;

            // Only continue to next path segment if not close enough.
            if (closestDistanceSquared < scaryDistanceSquared) {
                break;
            }
        }

        return {closestId: closestId, closestDistance: Math.sqrt(closestDistanceSquared), closestPosition: closestPosition, closestDirection: closestDirection, closestTime: closestTime};
    },

    // Returns firing info object containing result (AIUtils._FIRING_RESULTS), target (Tank object), closestDistance (float), pathLength (float) and direction ({x,y})
    checkFiringPath: function(tank, tanks, gameController, angle, bounces, maxLength, weaponType) {

        const pathInfo = B2DUtils.calculateFiringPath(gameController.getB2DWorld(), tank, angle, bounces, maxLength, true);

        // Unless firing the laser, first check if first segment of multi-segment firing path is too short increasing the chance we might hit ourselves.
        // FIXME Check when adding weapon.
        if (weaponType !== Constants.WEAPON_TYPES.LASER) {
            if (pathInfo.firstSegmentLength < Constants.AI.MIN_FIRST_SEGMENT_TO_FIRE && pathInfo.length > pathInfo.firstSegmentLength) {
                return {result: AIUtils._FIRING_RESULTS.SUICIDE, target: tank, closestDistance: 0, pathLength: pathInfo.length, direction: pathInfo.direction};
            }
        }

        // First check if there is a hit.
        if (pathInfo.hit) {
            // FIXME Treat team mates as suicide or similar!
            let result = AIUtils._FIRING_RESULTS.HIT;
            if (pathInfo.hit === tank) {
                result = AIUtils._FIRING_RESULTS.SUICIDE;
            }

            return {result: result, target: pathInfo.hit, closestDistance: 0, pathLength: pathInfo.length, direction: pathInfo.direction};
        } else {
            // Find the closest distance to another tank.
            let closestDistanceSquared = Number.MAX_VALUE;
            let closestPathLength = maxLength;
            let result = AIUtils._FIRING_RESULTS.MISS;
            let target = null;
            let currentPathLength = 0;

            for (let i = 0; i < pathInfo.path.length - 1; ++i) {
                // For each segment of projectile path, find closest points.
                const segmentStartX = pathInfo.path[i].x;
                const segmentStartY = pathInfo.path[i].y;
                const segmentEndX = pathInfo.path[i + 1].x;
                const segmentEndY = pathInfo.path[i + 1].y;
                let diffSegmentX = segmentEndX - segmentStartX;
                let diffSegmentY = segmentEndY - segmentStartY;
                const diffSegmentLength = Math.sqrt(diffSegmentX * diffSegmentX + diffSegmentY * diffSegmentY);
                diffSegmentX /= diffSegmentLength;
                diffSegmentY /= diffSegmentLength;
                for (const tankId in tanks) {
                    if (tankId !== tank.getPlayerId()) {
                        // Ignore tanks with a shield.
                        if (AIUtils.checkProtected(tankId, gameController)) {
                            continue;
                        }
                        // FIXME Do not consider team mates!
                        const tankPosition = {x: tanks[tankId].getX(), y: tanks[tankId].getY()};
                        const diffTankX = tankPosition.x - segmentStartX;
                        const diffTankY = tankPosition.y - segmentStartY;
                        let t = (diffTankX * diffSegmentX + diffTankY * diffSegmentY);
                        // Clamp the closest point to be on the segment. Add a small margin to ensure following collision test does not fail.
                        t = Math.min(Math.max(t, Constants.PATH_MIN_STEP_LENGTH), diffSegmentLength-Constants.PATH_MIN_STEP_LENGTH);
                        const position = {x: segmentStartX + t * diffSegmentX, y: segmentStartY + t * diffSegmentY};
                        // Check if closest point is blocked by maze.
                        if (!B2DUtils.checkLineForMazeCollision(gameController.getB2DWorld(), position, tankPosition)) {
                            const distanceSquared = (tankPosition.x - position.x) * (tankPosition.x - position.x) + (tankPosition.y - position.y) * (tankPosition.y - position.y);
                            if (distanceSquared < closestDistanceSquared) {
                                result = AIUtils._FIRING_RESULTS.NEAR;
                                closestDistanceSquared = distanceSquared;
                                target = tanks[tankId];
                                closestPathLength = currentPathLength + t;
                            }
                        }
                    }
                }

                currentPathLength += diffSegmentLength;
            }

            return {result: result, target: target, closestDistance: Math.sqrt(closestDistanceSquared), pathLength: closestPathLength, direction: pathInfo.direction};
        }
    },

    getActionsToFollowPath: function(path, tile, driveToTileActionType, driveToPositionActionType, dexterity) {
        const result = [];
        for (let i = 0; i < path.length; ++i) {
            const imprecision = MathUtils.randomAroundZero(MathUtils.linearInterpolation(Constants.AI.MAX_ROTATION_IMPRECISION, 0, dexterity));
            result.push({type: driveToTileActionType, position: path[i], canReverse: path.length <= Constants.AI.MAX_PATH_LENGTH_TO_REVERSE, imprecision: imprecision});
        }
        if (tile) {
            const position = {
                x: (tile.x + 0.5) * Constants.MAZE_TILE_SIZE.m,
                y: (tile.y + 0.5) * Constants.MAZE_TILE_SIZE.m
            };
            const imprecision = MathUtils.randomAroundZero(MathUtils.linearInterpolation(Constants.AI.MAX_ROTATION_IMPRECISION, 0, dexterity));
            result.push({type: driveToPositionActionType, position: position, canReverse: path.length <= Constants.AI.MAX_PATH_LENGTH_TO_REVERSE, imprecision: imprecision});
        }

        return result;
    },

    getInputToDriveToPosition: function(tank, targetPosition, canReverse, angleImprecision) {
        let forwardState = false;
        let backState = false;
        let leftState = false;
        let rightState = false;
        let fireState = false;


        // FIXME This code is more or less duplicated in MouseInputManager.js

        // Rotate direction into tank's local space.
        const relativeToTank = B2DUtils.toLocalSpace(tank.getB2DBody(), targetPosition);

        const magnitude = relativeToTank.Length();
        let angle = Math.atan2(relativeToTank.y, relativeToTank.x);

        angle += angleImprecision;

        let goInReverse = false;

        // Normally it would be < 0.0, but the tank graphics is rotated 90 degrees CCW
        if (angle > Math.PI * 0.5 + Constants.AI.ROTATION_DEAD_ANGLE || angle < -Math.PI * 0.5 - Constants.AI.ROTATION_DEAD_ANGLE) {
            // Turn left unless it's better to reverse.
            if (angle > 0 && canReverse) {
                rightState = true;
                goInReverse = true;
            } else {
                leftState = true;
            }
        } else if (angle > -Math.PI * 0.5 + Constants.AI.ROTATION_DEAD_ANGLE && angle < Math.PI * 0.5 - Constants.AI.ROTATION_DEAD_ANGLE) {
            // Turn right unless it's better to reverse.
            if (angle > 0 && canReverse) {
                leftState = true;
                goInReverse = true;
            } else {
                rightState = true;
            }
        } else if (angle > 0) { // If true, the target position must be directly behind the tank.
            if (canReverse) {
                // Back straight.
                goInReverse = true;
            } else {
                // Turn to face direction.
                if (angle > Math.PI * 0.5) {
                    leftState = true;
                } else {
                    rightState = true;
                }
            }
        }

        // Only drive if out of dead zone.
        if (magnitude > Constants.AI.POSITION_DEAD_DISTANCE) {
            // Let previous computations determine if we reverse or not.
            // Only move if the tank is almost facing the right direction.
            if (goInReverse && angle > Math.PI * 0.5 - Constants.AI.POSITION_DEAD_ANGLE && angle < Math.PI * 0.5 + Constants.AI.POSITION_DEAD_ANGLE) {
                backState = true;
            } else if (angle > -Math.PI * 0.5 - Constants.AI.POSITION_DEAD_ANGLE && angle < -Math.PI * 0.5 + Constants.AI.POSITION_DEAD_ANGLE) {
                forwardState = true;
            }
        }

        return InputState.withState(tank.getPlayerId(), forwardState, backState, leftState, rightState, fireState);
    },

    getInputToTurnToDirection: function(tank, direction, angleImprecision) {
        let forwardState = false;
        let backState = false;
        let leftState = false;
        let rightState = false;
        let fireState = false;

        const relativeToTank = B2DUtils.directionToLocalSpace(tank.getB2DBody(), direction);
        let angle = Math.atan2(relativeToTank.y, relativeToTank.x);

        angle += angleImprecision;

        // Normally it would be < 0.0, but the tank graphics is rotated 90 degrees CCW
        if (angle > Math.PI * 0.5 + Constants.AI.ROTATION_DEAD_ANGLE || angle < -Math.PI * 0.5 - Constants.AI.ROTATION_DEAD_ANGLE) {
            leftState = true;
        } else if (angle > -Math.PI * 0.5 + Constants.AI.ROTATION_DEAD_ANGLE && angle < Math.PI * 0.5 - Constants.AI.ROTATION_DEAD_ANGLE) {
            rightState = true;
        } else if (angle > 0) {
            if (angle > Math.PI * 0.5) {
                leftState = true;
            } else {
                rightState = true;
            }
        }

        return InputState.withState(tank.getPlayerId(), forwardState, backState, leftState, rightState, fireState);
    },

    getInputToFire: function(tank, delay) {
        const forwardState = false;
        const backState = false;
        const leftState = false;
        const rightState = false;
        const fireState = delay <= 0;

        return InputState.withState(tank.getPlayerId(), forwardState, backState, leftState, rightState, fireState);
    }
});

AIUtils.classFields({
    _FIRING_RESULTS: {
        SUICIDE: "suicide",
        HIT: "hit",
        NEAR: "near",
        MISS: "miss"
    }
});

if (typeof module === 'object') {
    module.exports = AIUtils;
}
