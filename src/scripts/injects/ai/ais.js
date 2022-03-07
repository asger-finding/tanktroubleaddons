var AIs = Classy.newClass(); // eslint-disable-line no-var

AIs.classFields({
    // The current AIManager instances.
    aiManagers: [],
    // Object containing all AI configurations with id as key.
    ais: {},
    // Object containing array of AIs that are in use for each game with game id as key.
    aisInUse: {},
    initialized: false,
    log: null
});

AIs.classMethods({
    init: function() {
        AIs.log = Log.create('AIs');

        // Fetch AIs from backend.
        Backend.getInstance().getAIs(
            function (result) {
                if (Array.isArray(result)) {
                    for(let i = 0; i < result.length; ++i) {
                        AIs.ais[result[i].playerId] = result[i].config;
                    }
                    AIs.initialized = true;
                } else {
                    AIs.log.error("Failed to initialize AIs");
                }
            },
            function (result) {
                AIs.log.error("Failed to initialize AIs");
            },
            null
        );
    },

    isReady: function() {
        return AIs.initialized;
    },

    // Assumes that isReady has been called to verify that AIs have been fetched from the backend.
    isAI: function(aiId) {
        return AIs.ais[aiId] !== undefined;
    },

    // Assumes that isReady has been called to verify that AIs have been fetched from the backend.
    getAI: function(aiId) {
        return AIs.ais[aiId];
    },

    // Assumes that isReady has been called to verify that AIs have been fetched from the backend.
    getAvailableAIId: function(gameId, difficulty) {
        // FIXME Look for difficulty.
        // Find available AI.
        const aiIds = Object.keys(AIs.ais);

        if (AIs.aisInUse[gameId] === undefined) {
            return aiIds[0];
        }

        for (let i = 0; i < aiIds.length; ++i) {
            let inUse = false;
            for (let j = 0; j < AIs.aisInUse[gameId].length; ++j) {
                if (AIs.aisInUse[gameId][j] === aiIds[i]) {
                    inUse = true;
                    break;
                }
            }
            if (!inUse) {
                return aiIds[i];
            }
        }
        
        return null;
    },

    // Assumes that isReady has been called to verify that AIs have been fetched from the backend.
    getAllAIIds: function() {
        const aiIds = Object.keys(AIs.ais);
        return aiIds;
    },

    // Assumes that isReady has been called to verify that AIs have been fetched from the backend.
    getUnavailableAIIds: function(gameId) {
        if (AIs.aisInUse[gameId] === undefined) {
            return [];
        }

        // Find all unavailable AIs.
        const unavilableAIIds = [];
        const aiIds = Object.keys(AIs.ais);
        for (let i = 0; i < aiIds.length; ++i) {
            for (let j = 0; j < AIs.aisInUse[gameId].length; ++j) {
                if (AIs.aisInUse[gameId][j] === aiIds[i]) {
                    unavilableAIIds.push(aiIds[i]);
                    break;
                }
            }
        }
        return unavilableAIIds;
    },

    // Assumes that isReady has been called to verify that AIs have been fetched from the backend.
    addAIManager: function(gameController, aiId) {
        const aiConfig = AIs.ais[aiId];
        AIs.aiManagers.push(AIManager.create(aiId, aiConfig, gameController));
        if (AIs.aisInUse[gameController.getId()] === undefined) {
            AIs.aisInUse[gameController.getId()] = [];
        }
        AIs.aisInUse[gameController.getId()].push(aiId);

        return true;
    },
    
    removeAIManager: function(gameId, aiId) {

        for (let i = 0; i < AIs.aiManagers.length; ++i) {
            const aiManager = AIs.aiManagers[i];
            if (aiManager.getAIId() == aiId && aiManager.getGameId() == gameId) {
                aiManager.shutdown();
                AIs.aiManagers.splice(i, 1);
                break;
            }
        }

        for (let i = 0; i < AIs.aisInUse[gameId].length; ++i) {
            if (AIs.aisInUse[gameId][i] === aiId) {
                AIs.aisInUse[gameId].splice(i, 1);
                break;
            }
        }

        if (AIs.aisInUse[gameId].length === 0) {
            delete AIs.aisInUse[gameId];
        }
    },

    removeAllAIManagers: function() {
        for (let i = 0; i < AIs.aiManagers.length; ++i) {
            const aiManager = AIs.aiManagers[i];
            AIs.removeAIManager(aiManager.getGameId(), aiManager.getAIId());
        }
    },
    
    update: function(deltaTime) {
        for (let i = 0; i < AIs.aiManagers.length; ++i) {
            AIs.aiManagers[i].update(deltaTime);
        }
    },

    reset: function() {
        for (let i = 0; i < AIs.aiManagers.length; ++i) {
            AIs.aiManagers[i].reset();
        }
    }
});

if (typeof module === 'object') {
    module.exports = AIs;
}
