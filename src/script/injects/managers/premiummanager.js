const PremiumManager = Classy.newClass();

PremiumManager.classFields({
    hasPremium: false
});

PremiumManager.classMethods({
    loadPremiumPresent: function() {
        if (typeof g_initialPremiumPresent === "boolean") {
            PremiumManager.hasPremium = g_initialPremiumPresent;
        }
    },

    init: function() {
        ClientManager.getClient().addEventListener(PremiumManager._clientEventHandler, PremiumManager);
        Users.addEventListener(PremiumManager._authenticationEventHandler, PremiumManager);
        PremiumManager._checkForPremium();
    },

    isPremiumPresent: function() {
        return PremiumManager.hasPremium;
    },

    _checkForPremium: function() {
        const playerIds = Users.getAuthenticatedPlayerIds();
        let numDetailsResponses = 0;
        const numExpectedDetailsResponses = playerIds.length;
        let hasPremium = false;

        if (playerIds.length == 0) {
            PremiumManager._updatePremium(hasPremium);
        }

        for (let i = 0; i < playerIds.length; ++i) {
            Backend.getInstance().getPlayerDetails(
                function(result) {
                    if (typeof(result) == "object") {
                        if (result.getPremium()) {
                            hasPremium = true;
                        }
                    }
                },
                function(result) {

                },
                function(result) {
                    // Count that we got a response.
                    ++numDetailsResponses;
                    // If we have them all, check if any was premium.
                    if (numDetailsResponses == numExpectedDetailsResponses) {
                        PremiumManager._updatePremium(hasPremium);
                    }

                },
                playerIds[i],
                Caches.getPlayerDetailsCache()
            );
        }
    },

    _updatePremium: function(hasPremium) {
        PremiumManager.hasPremium = hasPremium;

        if (hasPremium) {
            $("body").addClass("premium");
        } else {
            $("body").removeClass("premium");
        }
        ResizeManager.refresh();
    },

    _authenticationEventHandler: function(self, evt, data) {
        switch(evt) {
            case Users.EVENTS.PLAYER_AUTHENTICATED:
            case Users.EVENTS.PLAYER_DEAUTHENTICATED:
            case Users.EVENTS.PLAYER_UPDATED:
            {
                PremiumManager._checkForPremium();
                break;
            }
        }
    },

    _clientEventHandler: function(self, evt, data) {
        switch(evt) {
            case TTClient.EVENTS.PLAYER_UPDATED:
            {
                if (Users.isAnyUser(data.getPlayerId())) {
                    PremiumManager._checkForPremium();
                }
                break;
            }
        }
    }
});
