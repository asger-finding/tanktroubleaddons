var Users = Classy.newClass();

Users.classFields({
    authenticatedUsers: {},
    guestUsers: {},
    highestGmUser: "",
    highestGmLevel: null,
    adminRoles: [],
    eventListeners: [],
    EVENTS: {
        PLAYER_AUTHENTICATED: "player authenticated",
        PLAYER_DEAUTHENTICATED: "player deauthenticated",
        GUEST_ADDED: "guest added",
        GUESTS_ADDED: "guests added",
        GUEST_REMOVED: "guest removed",
        GUEST_SIGNED_UP: "guest signed up",
        PLAYER_UPDATED: "player updated"
    }
});

Users.classMethods({
    addEventListener: function(callback, context) {
        Users.eventListeners.push({cb: callback, ctxt: context});
    },

    removeEventListener: function(callback, context) {
        for (let i = 0;i<Users.eventListeners.length;i++) {
            if (Users.eventListeners[i].cb===callback && Users.eventListeners[i].ctxt===context) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                Users.eventListeners.splice(i, 1);
                return;
            }
        }
    },

    loadAuthenticatedUsers: function() {
        if (typeof g_users === "object") {
            const playerIds = Object.keys(g_users);
            for (let i = 0; i<playerIds.length; i++) {
                Users.addAuthenticatedUser(playerIds[i], g_users[playerIds[i]].multiplayerToken);
            }
        }
    },

    loadGuestUsers: function() {
        if (typeof g_guests === "object") {
            const playerIds = Object.keys(g_guests);
            for (let i = 0; i<playerIds.length; i++) {
                Users.addGuestUser(playerIds[i], g_guests[playerIds[i]].multiplayerToken);
            }
        }
    },

    loadHighestGm: function() {
        if (typeof g_initialHighestGmLevel === "number") {
            Users.highestGmLevel = g_initialHighestGmLevel;
        }
        if (typeof g_initialHighestGmUser === "string") {
            Users.highestGmUser = g_initialHighestGmUser;
        }
    },

    loadAdminRoles: function() {
        if (Array.isArray(g_initialAdminRoles)) {
            Users.adminRoles = g_initialAdminRoles;
        }
    },

    init: function() {
        Users.addEventListener(Users._authenticationEventHandler, Users);
        Users._updateGm();
    },

    addAuthenticatedUser: function(playerId, multiplayerToken) {
        Users.authenticatedUsers[playerId] = multiplayerToken;
        Users._notifyEventListeners(Users.EVENTS.PLAYER_AUTHENTICATED, playerId);
    },

    removeAuthenticatedUser: function(playerId) {
        delete Users.authenticatedUsers[playerId];
        Users._notifyEventListeners(Users.EVENTS.PLAYER_DEAUTHENTICATED, playerId);
    },

    addGuestUser: function(playerId, multiplayerToken) {
        Users.guestUsers[playerId] = multiplayerToken;
        Users._notifyEventListeners(Users.EVENTS.GUEST_ADDED, playerId);
    },

    addGuestUsers: function(playerIds, multiplayerTokens) {
        for (let i = 0; i < playerIds.length; ++i) {
            Users.guestUsers[playerIds[i]] = multiplayerTokens[i];
        }
        Users._notifyEventListeners(Users.EVENTS.GUESTS_ADDED, playerIds);
    },

    removeGuestUser: function(playerId) {
        delete Users.guestUsers[playerId];
        Users._notifyEventListeners(Users.EVENTS.GUEST_REMOVED, playerId);
    },

    signUpGuestUser: function(playerId) {
        const multiplayerToken = Users.guestUsers[playerId];
        delete Users.guestUsers[playerId];
        Users.authenticatedUsers[playerId] = multiplayerToken;
        Users._notifyEventListeners(Users.EVENTS.GUEST_SIGNED_UP, playerId);
    },

    updateUser: function(playerId, iconChanged, usernameChanged) {
        const change = {playerId: playerId, iconChanged: iconChanged, usernameChanged: usernameChanged};
        Users._notifyEventListeners(Users.EVENTS.PLAYER_UPDATED, change);
    },

    getAuthenticatedPlayerIds: function() {
        return Object.keys(Users.authenticatedUsers);
    },

    getAuthenticatedMultiplayerToken: function(playerId) {
        return Users.authenticatedUsers[playerId];
    },

    getAuthenticatedMultiplayerTokens: function(playerIds) {
        const tokens = [];
        for (let i = 0; i < playerIds.length; ++i) {
            tokens.push(Users.authenticatedUsers[playerIds[i]]);
        }

        return tokens;
    },

    isAuthenticatedUser: function(playerId) {
		return Object.prototype.hasOwnProperty.call(Users.authenticatedUsers, playerId);
    },

    getGuestPlayerIds: function() {
        return Object.keys(Users.guestUsers);
    },

    getHighestGmUser: function() {
        return Users.highestGmUser;
    },

    getHighestGmLevel: function() {
        return Users.highestGmLevel;
    },

    hasAdminRole: function(role) {
        for(let i = 0; i < Users.adminRoles.length; ++i) {
            const userAdminRoles = Users.adminRoles[i];
            for(let j = 0; j < userAdminRoles.roles.length; ++j) {
                if (userAdminRoles.roles[j] === role) {
                    return true;
                }
            }
        }

        return false;
    },

    hasSpecificUserAdminRole: function(playerId, role) {
        for(let i = 0; i < Users.adminRoles.length; ++i) {
            const userAdminRoles = Users.adminRoles[i];
            if (userAdminRoles.playerId === playerId) {
                for(let j = 0; j < userAdminRoles.roles.length; ++j) {
                    if (userAdminRoles.roles[j] === role) {
                        return true;
                    }
                }
            }
        }

        return false;
    },

    getAdminUserForRole: function(role) {
        for(let i = 0; i < Users.adminRoles.length; ++i) {
            const userAdminRoles = Users.adminRoles[i];
            for(let j = 0; j < userAdminRoles.roles.length; ++j) {
                if (userAdminRoles.roles[j] === role) {
                    return userAdminRoles.playerId;
                }
            }
        }

        return null;
    },

    getGuestMultiplayerToken: function(playerId) {
        return Users.guestUsers[playerId];
    },

    getGuestMultiplayerTokens: function(playerIds) {
        const tokens = [];
        for (let i = 0; i < playerIds.length; ++i) {
            tokens.push(Users.guestUsers[playerIds[i]]);
        }

        return tokens;
    },

    isGuestUser: function(playerId) {
		return Object.prototype.hasOwnProperty.call(Users.guestUsers, playerId);
    },

    isAnyUser: function(playerId) {
        return this.isAuthenticatedUser(playerId) || this.isGuestUser(playerId);
    },

    getAllPlayerIds: function() {
        return Object.keys(Users.authenticatedUsers).concat(Object.keys(Users.guestUsers));
    },

    _updateGm: function() {
        Users.highestGmUser = "";
        Users.highestGmLevel = null;
        Users.adminRoles = null;

        const playerIds = Users.getAuthenticatedPlayerIds();
        let numDetailsResponses = 0;
        const numExpectedDetailsResponses = playerIds.length;
        let highestGmPlayerId = "";
        let highestGmLevel = null;

        for (let i = 0; i < playerIds.length; ++i) {
            Backend.getInstance().getPlayerDetails(
                function(result) {
                    if (typeof(result) == "object") {
                        if (result.getGmLevel() !== null && result.getGmLevel() > highestGmLevel) {
                            highestGmPlayerId = result.getPlayerId();
                            highestGmLevel = result.getGmLevel();
                        }
                    }
                },
                function(result) {

                },
                function(result) {
                    // Count that we got a response.
                    ++numDetailsResponses;
                    // If we have them all, update result.
                    if (numDetailsResponses == numExpectedDetailsResponses) {
                        Users.highestGmUser = highestGmPlayerId;
                        Users.highestGmLevel = highestGmLevel;
                    }

                },
                playerIds[i],
                Caches.getPlayerDetailsCache()
            );
        }
        Backend.getInstance().getAdminRoles(
            function(result) {
                if (Array.isArray(result)) {
                    Users.adminRoles = result;
                }
            },
            null,
            null,
            playerIds
        );
    },

    _notifyEventListeners: function(evt, data) {
        for (let i = 0;i<Users.eventListeners.length;i++) {
            Users.eventListeners[i].cb(Users.eventListeners[i].ctxt, evt, data);
        }
    },

    _authenticationEventHandler: function(self, evt, data) {
        switch(evt) {
            case Users.EVENTS.PLAYER_AUTHENTICATED:
            case Users.EVENTS.PLAYER_DEAUTHENTICATED:
            case Users.EVENTS.PLAYER_UPDATED:
            {
                Users._updateGm();
                break;
            }
        }
    }
});
