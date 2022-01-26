if (typeof require === 'function') {
    var Classy = require('./classy');
    var Constants = require('./constants');
}

var MazeThemeManager = Classy.newClass();

MazeThemeManager.classFields({
    preparedThemes: {}
});

MazeThemeManager.classMethods({
    _prepareTheme: function(theme) {
        var newTheme = {};

        // Allocate maps
        newTheme.wallConfigurationToFloors = []; // Map from wall configuration to floor image names and rotations that fit
        newTheme.wallConfigurationToFloorWeightSum = []; // Map from wall configuration to floor weight sum
        newTheme.wallConfigurationToSpaces = []; // Map from wall configuration to space image names and rotations that fit
        newTheme.wallConfigurationToSpaceWeightSum = []; // Map from wall configuration to space weight sum
        newTheme.wallConfigurationToWallDecorations = []; // Map from wall configuration to wall decoration image names and rotations that fit
        newTheme.wallConfigurationToWallDecorationWeightSum = []; // Map from wall configuration to wall decoration weight sum

        for (var i = 0; i < 16; ++i) {
            newTheme.wallConfigurationToFloors.push([]);
            newTheme.wallConfigurationToFloorWeightSum.push(0.0);
            newTheme.wallConfigurationToSpaces.push([]);
            newTheme.wallConfigurationToSpaceWeightSum.push(0.0);
            newTheme.wallConfigurationToWallDecorations.push([]);
            newTheme.wallConfigurationToWallDecorationWeightSum.push(0.0);
        }

        var themeInfo = Constants.MAZE_THEME_INFO[theme];

        // Fill in floor map.
        for (var i = 0; i < themeInfo.FLOOR_CONFIG.length; ++i) {
            var config = themeInfo.FLOOR_CONFIG[i];
            var requiredWalls = config.required;
            var missingWalls = config.missing;
            for (var rotation = 0; rotation < 4; ++rotation) {
                // Do circular shift corresponding to clockwise rotation.
                var rotatedRequiredWalls = (requiredWalls >>> rotation) | ((requiredWalls << (4 - rotation)) & 15);
                var rotatedMissingWalls = (missingWalls >>> rotation) | ((missingWalls << (4 - rotation)) & 15);

                for (var j = 0; j < 16; ++j) {
                    if (((j & rotatedRequiredWalls) == rotatedRequiredWalls) && (j & rotatedMissingWalls) == 0) {
                        newTheme.wallConfigurationToFloors[j].push({number: i, rotation: rotation * Math.PI / 2, weight: config.weight});
                        newTheme.wallConfigurationToFloorWeightSum[j] += config.weight;
                    }
                }

            }
        }
        // Fill in space map.
        for (var i = 0; i < themeInfo.SPACE_CONFIG.length; ++i) {
            var config = themeInfo.SPACE_CONFIG[i];
            var requiredWalls = config.required;
            var missingWalls = config.missing;
            for (var rotation = 0; rotation < 4; ++rotation) {
                // Do circular shift corresponding to clockwise rotation.
                var rotatedRequiredWalls = (requiredWalls >>> rotation) | ((requiredWalls << (4 - rotation)) & 15);
                var rotatedMissingWalls = (missingWalls >>> rotation) | ((missingWalls << (4 - rotation)) & 15);

                for (var j = 0; j < 16; ++j) {
                    if (((j & rotatedRequiredWalls) == rotatedRequiredWalls) && (j & rotatedMissingWalls) == 0) {
                        newTheme.wallConfigurationToSpaces[j].push({number: i, rotation: rotation * Math.PI / 2, weight: config.weight});
                        newTheme.wallConfigurationToSpaceWeightSum[j] += config.weight;
                    }
                }

            }
        }
        // Fill in wall decoration map.
        for (var i = 0; i < themeInfo.WALL_DECORATION_CONFIG.length; ++i) {
            var config = themeInfo.WALL_DECORATION_CONFIG[i];
            var requiredWalls = config.required;
            var missingWalls = config.missing;
            for (var rotation = 0; rotation < 4; ++rotation) {
                // Do circular shift corresponding to clockwise rotation.
                var rotatedRequiredWalls = (requiredWalls >>> rotation) | ((requiredWalls << (4 - rotation)) & 15);
                var rotatedMissingWalls = (missingWalls >>> rotation) | ((missingWalls << (4 - rotation)) & 15);

                for (var j = 0; j < 16; ++j) {
                    if (((j & rotatedRequiredWalls) == rotatedRequiredWalls) && (j & rotatedMissingWalls) == 0) {
                        newTheme.wallConfigurationToWallDecorations[j].push({number: i, rotation: rotation * Math.PI / 2, weight: config.weight});
                        newTheme.wallConfigurationToWallDecorationWeightSum[j] += config.weight;
                    }
                }

            }
        }

        // Sum border and wall weights.
        newTheme.borders = [];
        newTheme.borderWeightSum = 0.0;
        newTheme.walls = [];
        newTheme.wallWeightSum = 0.0;

        for (var i = 0; i < themeInfo.BORDER_CONFIG.length; ++i) {
            var config = themeInfo.BORDER_CONFIG[i];
            newTheme.borders.push({number: i, flip: config.flip, weight: config.weight});
            newTheme.borderWeightSum += config.weight;
        }

        for (var i = 0; i < themeInfo.WALL_CONFIG.length; ++i) {
            var config = themeInfo.WALL_CONFIG[i];
            newTheme.walls.push({number: i, flipX: config.flipX, flipY: config.flipY, weight: config.weight});
            newTheme.wallWeightSum += config.weight;
        }

        MazeThemeManager.preparedThemes[theme] = newTheme;
    },

    getRandomFloor: function(theme, wallConfiguration) {
        if (MazeThemeManager.preparedThemes[theme] === undefined) {
            MazeThemeManager._prepareTheme(theme);
        }

        return MazeThemeManager._getWeightedRandomElement(
            MazeThemeManager.preparedThemes[theme].wallConfigurationToFloors[wallConfiguration],
            MazeThemeManager.preparedThemes[theme].wallConfigurationToFloorWeightSum[wallConfiguration]
        );
    },

    getRandomSpace: function(theme, wallConfiguration) {
        if (MazeThemeManager.preparedThemes[theme] === undefined) {
            MazeThemeManager._prepareTheme(theme);
        }

        return MazeThemeManager._getWeightedRandomElement(
            MazeThemeManager.preparedThemes[theme].wallConfigurationToSpaces[wallConfiguration],
            MazeThemeManager.preparedThemes[theme].wallConfigurationToSpaceWeightSum[wallConfiguration]
        );
    },

    getRandomWallDecoration: function(theme, wallConfiguration) {
        if (MazeThemeManager.preparedThemes[theme] === undefined) {
            MazeThemeManager._prepareTheme(theme);
        }

        if (Math.random() >= Constants.MAZE_THEME_INFO[theme].WALL_DECORATION_PROBABILITY) {
            return null;
        }

        return MazeThemeManager._getWeightedRandomElement(
            MazeThemeManager.preparedThemes[theme].wallConfigurationToWallDecorations[wallConfiguration],
            MazeThemeManager.preparedThemes[theme].wallConfigurationToWallDecorationWeightSum[wallConfiguration]
        );
    },

    getRandomBorders: function(theme, wallConfiguration) {
        if (MazeThemeManager.preparedThemes[theme] === undefined) {
            MazeThemeManager._prepareTheme(theme);
        }

        var result = [];

        if (Constants.MAZE_THEME_INFO[theme].BORDER_CONFIG.length == 0) {
            return result;
        }

        if (wallConfiguration & 1 << 0) {
            var border = MazeThemeManager._getWeightedRandomElement(
                MazeThemeManager.preparedThemes[theme].borders,
                MazeThemeManager.preparedThemes[theme].borderWeightSum
            );
            result.push({
                number: border.number,
                offsetX: 0,
                offsetY: -0.5,
                rotation: Math.PI,
                flip: border.flip ? Math.random() > 0.5 : false
            });
        }
        if (wallConfiguration & 1 << 1) {
            var border = MazeThemeManager._getWeightedRandomElement(
                MazeThemeManager.preparedThemes[theme].borders,
                MazeThemeManager.preparedThemes[theme].borderWeightSum
            );
            result.push({
                number: border.number,
                offsetX: -0.5,
                offsetY: 0,
                rotation: Math.PI / 2,
                flip: border.flip ? Math.random() > 0.5 : false
            });
        }
        if (wallConfiguration & 1 << 2) {
            var border = MazeThemeManager._getWeightedRandomElement(
                MazeThemeManager.preparedThemes[theme].borders,
                MazeThemeManager.preparedThemes[theme].borderWeightSum
            );
            result.push({
                number: border.number,
                offsetX: 0,
                offsetY: 0.5,
                rotation: 0,
                flip: border.flip ? Math.random() > 0.5 : false
            });
        }
        if (wallConfiguration & 1 << 3) {
            var border = MazeThemeManager._getWeightedRandomElement(
                MazeThemeManager.preparedThemes[theme].borders,
                MazeThemeManager.preparedThemes[theme].borderWeightSum
            );
            result.push({
                number: border.number,
                offsetX: 0.5,
                offsetY: 0,
                rotation: -Math.PI / 2,
                flip: border.flip ? Math.random() > 0.5 : false
            });
        }

        return result;
    },

    getRandomWalls: function(theme, wallConfiguration) {
        if (MazeThemeManager.preparedThemes[theme] === undefined) {
            MazeThemeManager._prepareTheme(theme);
        }

        var result = [];

        if (Constants.MAZE_THEME_INFO[theme].WALL_CONFIG.length == 0) {
            return result;
        }

        if (wallConfiguration & 1 << 0) {
            var wall = MazeThemeManager._getWeightedRandomElement(
                MazeThemeManager.preparedThemes[theme].walls,
                MazeThemeManager.preparedThemes[theme].wallWeightSum
            );
            result.push({
                number: wall.number,
                rotation: 0,
                offsetX: 0,
                offsetY: -0.5,
                flipX: wall.flipX ? Math.random() > 0.5 : false,
                flipY: wall.flipY ? Math.random() > 0.5 : false
            });
        }
        if (wallConfiguration & 1 << 1) {
            var wall = MazeThemeManager._getWeightedRandomElement(
                MazeThemeManager.preparedThemes[theme].walls,
                MazeThemeManager.preparedThemes[theme].wallWeightSum
            );
            result.push({
                number: wall.number,
                rotation: Math.PI / 2,
                offsetX: -0.5,
                offsetY: 0.0,
                flipX: wall.flipX ? Math.random() > 0.5 : false,
                flipY: wall.flipY ? Math.random() > 0.5 : false
            });
        }

        return result;
    },

    getRandomActiveTheme: function() {
        var now = new Date();
        now.setUTCFullYear(1970);

        var activeThemes = [];

        for (var i = 0; i < Constants.MAZE_THEMES.COUNT; ++i) {
            if (Constants.MAZE_THEME_INFO[i].ACTIVE_DURATION_START !== undefined && Constants.MAZE_THEME_INFO[i].ACTIVE_DURATION_END !== undefined) {
                // Check if now is between duration start and end (minus the year).
                var start = Constants.MAZE_THEME_INFO[i].ACTIVE_DURATION_START;
                var end = Constants.MAZE_THEME_INFO[i].ACTIVE_DURATION_END;

                start.setUTCFullYear(1970);
                end.setUTCFullYear(1970);

                if (now >= start && now <= end) {
                    activeThemes.push(i);
                }

            } else {
                activeThemes.push(i);
            }
        }

        return activeThemes[Math.floor(Math.random() * activeThemes.length)];
    },

    _getWeightedRandomElement: function(array, weightSum) {
        var randomValue = Math.random() * weightSum;
        var accumWeight = 0.0;

        for (var i = 0; i < array.length; ++i) {
            if (randomValue <= accumWeight + array[i].weight) {
                return array[i];
            }

            accumWeight += array[i].weight;
        }

        return null;
    }
});

if (typeof module === 'object') {
    module.exports = MazeThemeManager;
}