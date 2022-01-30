var QualityManager = Classy.newClass();

QualityManager.classFields({
    quality: null,
    numFpsSamples: 0,
    avgFps: 0,
    fpsTime: 0,
    QUALITY_SETTINGS: {
        AUTO: "auto",
        HIGH: "high",
        LOW: "low",
        MINIMUM: "minimum"
    },
    QUALITY_PARAMETERS: {
        TANK_EXPLOSION_SMOKE_COUNT: "tank explosion smoke count",
        TANK_EXPLOSION_FRAGMENT_COUNT: "tank explosion fragment count",
        MISSILE_LAUNCH_SMOKE_COUNT: "missile launch smoke count",
        MISSILE_SMOKE_FREQUENCY: "missile smoke frequency",
        CRATE_LAND_DUST_COUNT: "crate land dust count",
        AIMER_MIN_SEGMENT_LENGTH: "aimer min segment length",
        AIMER_OFF_MAX_SEGMENT_LENGTH: "aimer off max segment length",
        AIMER_ON_MAX_SEGMENT_LENGTH: "aimer on max segment length",
        BULLET_PUFF_COUNT: "bullet puff count",
        SHIELD_INVERSE_BOLT_PROBABILITY: "shield inverse bolt probability",
        SHIELD_SPARK_PARTICLES_PER_EMIT: "shield spark particles per emit",
        SPAWN_ZONE_INVERSE_UNSTABLE_PARTICLE_PROBABILITY: "spawn zone inverse unstable particle probability",
        SPAWN_ZONE_NUM_COLLAPSE_PARTICLES: "spawn zone num collapse particles"
    },
    QUALITY_VALUES: {
        "auto": {
            "tank explosion smoke count": 5,
            "tank explosion fragment count": 15,
            "missile launch smoke count": 20,
            "missile smoke frequency": 50,                              // ms / particle
            "crate land dust count": 20,
            "aimer min segment length": 0.0,                            // m
            "aimer off max segment length": 1.0,                        // m
            "aimer on max segment length": 0.3,                         // m
            "bullet puff count": 10,
            "shield inverse bolt probability": 0.95,
            "shield spark particles per emit": 4,
            "spawn zone inverse unstable particle probability": 0.5,
            "spawn zone num collapse particles": 40
        },
        "high": {
            "tank explosion smoke count": 5,
            "tank explosion fragment count": 15,
            "missile launch smoke count": 20,
            "missile smoke frequency": 50,                              // ms / particle
            "crate land dust count": 20,
            "aimer min segment length": 0.0,                            // m
            "aimer off max segment length": 1.0,                        // m
            "aimer on max segment length": 0.3,                         // m
            "bullet puff count": 10,
            "shield inverse bolt probability": 0.95,
            "shield spark particles per emit": 4,
            "spawn zone inverse unstable particle probability": 0.5,
            "spawn zone num collapse particles": 40
        },
        "low": {
            "tank explosion smoke count": 2,
            "tank explosion fragment count": 7,
            "missile launch smoke count": 10,
            "missile smoke frequency": 120,                             // ms / particle
            "crate land dust count": 10,
            "aimer min segment length": 0.5,                            // m
            "aimer off max segment length": 2.0,                        // m
            "aimer on max segment length": 1.0,                         // m
            "bullet puff count": 4,
            "shield inverse bolt probability": 0.99,
            "shield spark particles per emit": 1,
            "spawn zone inverse unstable particle probability": 0.9,
            "spawn zone num collapse particles": 20
        },
        "minimum": {
            "tank explosion smoke count": 1,
            "tank explosion fragment count": 0,
            "missile launch smoke count": 0,
            "missile smoke frequency": 360,                             // ms / particle
            "crate land dust count": 0,
            "aimer min segment length": 1.0,                            // m
            "aimer off max segment length": 4.0,                        // m
            "aimer on max segment length": 2.0,                         // m
            "bullet puff count": 1,
            "shield inverse bolt probability": 0.99,
            "shield spark particles per emit": 0,
            "spawn zone inverse unstable particle probability": 0.95,
            "spawn zone num collapse particles": 5
        }
    },
    eventListeners: [],
    EVENTS: {
        QUALITY_SET: "quality set",
        FPS_UPDATED: "fps updated"
    }
});

QualityManager.classMethods({
    addEventListener: function(callback, context) {
        QualityManager.eventListeners.push({cb: callback, ctxt: context});
    },
    
    removeEventListener: function(callback, context) {
        for (var i=0;i<QualityManager.eventListeners.length;i++) {
            if (QualityManager.eventListeners[i].cb===callback && QualityManager.eventListeners[i].ctxt===context) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                QualityManager.eventListeners.splice(i, 1);
                return;
            }
        }
    },
    
    loadQualitySettings: function() {
        if (Cookies.get('quality')) {
            QualityManager.setQuality(Cookies.get('quality'));
        } else {
            QualityManager.setQuality(QualityManager.QUALITY_SETTINGS.AUTO);
        }
    },

    init: function() {
        FocusManager.addEventListener(QualityManager._focusEventHandler, this);
    },

    setQuality: function(quality) {
        // Store the selected quality.
        Cookies.set('quality', quality, {expires: 365});
        QualityManager.quality = quality;

        QualityManager._notifyEventListeners(QualityManager.EVENTS.QUALITY_SET, quality);

        QualityManager.reset();
    },

    getQuality: function() {
        return QualityManager.quality;
    },

    getQualityValue: function(qualityParameter) {
        return QualityManager.QUALITY_VALUES[QualityManager.quality][qualityParameter];
    },

    update: function() {
        if (QualityManager.quality === QualityManager.QUALITY_SETTINGS.AUTO) {
            var time = Date.now();
            if (QualityManager.fpsTime > 0) {
                var currentFps = 1000.0 / (time - QualityManager.fpsTime);
                QualityManager.avgFps *= (1.0 - UIConstants.SETTINGS_QUALITY_FPS_AVG_WEIGHT);
                QualityManager.avgFps += currentFps * UIConstants.SETTINGS_QUALITY_FPS_AVG_WEIGHT;
                QualityManager.numFpsSamples++;
            }
            QualityManager.fpsTime = time;

            if (QualityManager.numFpsSamples > UIConstants.SETTINGS_QUALITY_FPS_MIN_SAMPLES) {
                if (QualityManager.numFpsSamples % UIConstants.SETTINGS_QUALITY_FPS_SAMPLE_UPDATE_INTERVAL === 0) {
                    QualityManager._notifyEventListeners(QualityManager.EVENTS.FPS_UPDATED, QualityManager.avgFps);
                }

                if (QualityManager.avgFps < UIConstants.SETTINGS_QUALITY_FPS_CHANGE_TO_LOW) {
                    QualityManager.setQuality(QualityManager.QUALITY_SETTINGS.LOW);
                }
            }
        }
    },

    reset: function() {
        QualityManager.numFpsSamples = 0;
        QualityManager.avgFps = 0;
        QualityManager.fpsTime = 0;
        QualityManager._notifyEventListeners(QualityManager.EVENTS.FPS_UPDATED, null);
    },

    _focusEventHandler: function(self, evt, data) {
        switch(evt) {
            case FocusManager.EVENTS.FOCUS:
            case FocusManager.EVENTS.BLUR:
            {
                self.reset();

                break;
            }
        }
    },

    _notifyEventListeners: function(evt, data) {
        for (var i=0;i<QualityManager.eventListeners.length;i++) {
            QualityManager.eventListeners[i].cb(QualityManager.eventListeners[i].ctxt, evt, data);
        }
    }
});