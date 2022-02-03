const ClientManager = Classy.newClass();

ClientManager.classFields({
    client: null,
    clientId: '',
    clientVersion: '',
    log: null,
    newlySelectedServerId: null,
    multiplayerServerId: null,
    reconnectTimeout: null,
    availableServers: {}
});

ClientManager.classMethods({
    loadAvailableServers: function() {
        if (typeof g_mpServers === "object") {
            const serverIds = g_mpServers["id"];
            const serverNames = g_mpServers["name"];
            const serverUrls = g_mpServers["url"];
            for (let i = 0; i < serverIds.length; ++i) {
                ClientManager.availableServers[serverIds[i]] = {name: serverNames[i], url: serverUrls[i], latency: undefined};
            }
        }
    },

    loadClientSettings: function() {
        if (Cookies.get('multiplayerserverid')) {
            ClientManager.multiplayerServerId = Cookies.get('multiplayerserverid');
        }
        ClientManager.clientId = g_clientId;
        ClientManager.clientVersion = g_version;
    },

    init: function() {
        ClientManager.log = Log.create("ClientManager");
        ClientManager.client = TTClient.create(
            ClientManager.clientId,
            ClientManager.clientVersion,
            GameManager,
            FocusManager,
            Caches.getPlayerDetailsCache(),
            Caches.getCurrencyCache(),
            Caches.getVirtualShopCache(),
            Caches.getTempBanValidityCache(),
            Caches.getGarageContentCache(),
            Caches.getUnseenAchievementsCache()
        );

        let playerIds = Users.getAuthenticatedPlayerIds();
        ClientManager.client.addUsers(playerIds, Users.getAuthenticatedMultiplayerTokens(playerIds));

        playerIds = Users.getGuestPlayerIds();
        ClientManager.client.addUsers(playerIds, Users.getGuestMultiplayerTokens(playerIds));

        if (ClientManager.multiplayerServerId) {
            ClientManager._attemptToConnectToServer(ClientManager.multiplayerServerId);
        } else {
            ClientManager._findAndConnectToBestAvailableServer();
        }

        Users.addEventListener(ClientManager._authenticationEventHandler, this);
        TankTrouble.ChatBox.addEventListener(ClientManager._chatEventHandler, this);
        ClientManager.getClient().addStateChangeListener(ClientManager._clientStateChangeHandler, this);
        ClientManager.getClient().addEventListener(ClientManager._clientEventHandler, this);
        ClientManager.getClient().addErrorListener(ClientManager._clientErrorHandler, this);
    },

    shutdown: function() {
        Users.removeEventListener(ClientManager._authenticationEventHandler, this);
        TankTrouble.ChatBox.removeEventListener(ClientManager._chatEventHandler, this);
        ClientManager.getClient().removeStateChangeListener(ClientManager._clientStateChangeHandler, this);
        ClientManager.getClient().removeEventListener(ClientManager._clientEventHandler, this);
        ClientManager.getClient().removeErrorListener(ClientManager._clientErrorHandler, this);

        // Disconnect from the current server.
        ClientManager.client.disconnect();

        // Clear reconnectTimeout.
        if (ClientManager.reconnectTimeout) {
            ClientManager.log.debug("Clear automatic reconnect attempt during shutdown");
            clearTimeout(ClientManager.reconnectTimeout);
            ClientManager.reconnectTimeout = null;
        }
    },

    getAvailableServers: function() {
        return ClientManager.availableServers;
    },

    getClient: function() {
        return ClientManager.client;
    },

    selectMultiplayerServer: function(id) {
        // Clear reconnectTimeout.
        if (ClientManager.reconnectTimeout) {
            clearTimeout(ClientManager.reconnectTimeout);
            ClientManager.reconnectTimeout = null;
        }

        if (ClientManager.client.getState() == TTClient.STATES.UNCONNECTED) {
            // Connect immediately.
            ClientManager._attemptToConnectToServer(id);
        } else {
            // Store server id for later connection.
            ClientManager.newlySelectedServerId = id;
            // Disconnect from the current server.
            ClientManager.client.disconnect();
        }
    },

    /**
     * Utility method for updating (and receiving callbacks)
     * on updated multiplayer server ping times.
     *
     * Callback functions provided get called with 6 parameters,
     * for each multiplayerserver in ClientManager.availableServers, regardless
     * of whether they can be reached or not:
     * - success: true if an updated latency could be calculated, false otherwise
     * - serverId: The id of the server, which can be used to identify the server in ClientManager.availableServers
     * - latency: Number of milliseconds. Undefined if no latency could be calculated.
     * - gameCount: Number of games. Undefined if no latency could be calculated.
     * - playerCount: Number of players. Undefined if no latency could be calculated.
     * - message: A human readable message in case success gets set to false
     *
     * @param cb A function which accepts 6 parameters (result, serverId, latency, gameCount, playerCount, message).
     */
    getAvailableServerStats: function(cb) {
        const serverIds = Object.keys(ClientManager.availableServers);
        // Generate a socket for each available server
        ClientManager.log.debug("Updating latencies");
        for (let i = 0;i<serverIds.length;i++) {
            ClientManager._getSelectedServerStats(serverIds[i], cb);
        }
    },

    /**
     * Utility method for updating (and receiving callbacks)
     * on updated multiplayer server ping times.
     *
     * Callback functions provided get called with 6 parameters,
     * for each multiplayerserver in ClientManager.availableServers, regardless
     * of whether they can be reached or not:
     * - success: true if an updated latency could be calculated, false otherwise
     * - serverId: The id of the server, which can be used to identify the server in ClientManager.availableServers
     * - latency: Number of milliseconds. Undefined if no latency could be calculated.
     * - gameCount: Number of games. Undefined if no latency could be calculated.
     * - playerCount: Number of players. Undefined if no latency could be calculated.
     * - message: A human readable message in case success gets set to false
     *
     * @param cb A function which accepts 6 parameters (result, serverId, latency, gameCount, playerCount, message).
     */
    _getSelectedServerStats: function(serverId, cb) {
        // Create a local scope for operating on serverId
        (function(serverId) {
            const availableServer = ClientManager.availableServers[serverId];

            if (!availableServer) {
                cb(false, serverId);
                return;
            }
            ClientManager.log.debug("Updating latency for " + serverId);

            // Create a new socket
            const socket = new WebSocket(availableServer.url);
            let pingTime = undefined;

            socket.onopen = function(event) {
                const msg = PingMessage.create();
                ClientManager.log.debug("Latency checking socket connected " + serverId);
                try {
                    socket.send(msg.pack());
                    pingTime = new Date();
                } catch (e) {
                    ClientManager.log.error("Failed to send ping on latency connection: " + e.message);
                }
            };

            socket.onerror = function(event) {
                ClientManager.log.error("Latency checking socket connect_error " +  serverId);
                ClientManager.availableServers[serverId].latency = undefined;
                cb(false, serverId);
            };

            socket.onmessage = function(event) {
                const msg = MessageParser.parse(event.data);
                if (!msg) {
                    socket.close();

                    cb(false, serverId, undefined, undefined, undefined, 'Failed to parse message received on latency connection');
                } else if (msg.getTypeId() === PongMessage.typeId) {
                    const pongTime = new Date();
                    socket.close();

                    const latency = pongTime - pingTime;
                    ClientManager.availableServers[serverId].latency = latency;

                    ClientManager.log.debug('Latency ' + serverId + ': ' + latency);
                    cb(true, serverId, latency, msg.getGameCount(), msg.getPlayerCount(), '');
                }
            };
        })(serverId);
    },

    _attemptToConnectToServer: function(serverId) {
        ClientManager.log.debug("Attempt to connect to server initiated: " + serverId);
        ClientManager._getSelectedServerStats(serverId, function(success, serverId, latency, gameCount, playerCount, message) {
            // Check if the client connected to another server while attempting to connect to this server.
            if (ClientManager.client.getState() === TTClient.STATES.UNCONNECTED) {
                if (success) {
                    // Enable server.
                    TankTrouble.SettingsBox.enableServer(serverId, latency);

                    // Set the server selection box.
                    TankTrouble.SettingsBox.setServer(serverId);

                    ClientManager.log.debug("Attempt to connect to server resulted in new connect: " + serverId);

                    // Store the selected server.
                    Cookies.set('multiplayerserverid', serverId, {expires: 365});
                    ClientManager.multiplayerServerId = serverId;

                    // Update statistics snippet.
                    TankTrouble.Statistics._updateStatistics();

                    // Connect.
                    ClientManager.client.connect(ClientManager.availableServers[serverId].url);
                } else {
                    // Disable server.
                    TankTrouble.SettingsBox.disableServer(serverId);

                    // Clear preselected server.
                    Cookies.remove('multiplayerserverid');
                    ClientManager.multiplayerServerId = null;

                    // Try to find available server.
                    ClientManager._findAndConnectToBestAvailableServer();
                }
            } else {
                ClientManager.log.debug("Client connected to other server while attempting to connect to this server: " + serverId);
            }
        });
    },

    _findAndConnectToBestAvailableServer: function() {
        ClientManager.log.debug("Find and connect to best available server initiated");

        const numAvailableServers = Object.keys(ClientManager.availableServers).length;
        let numServerResponses = 0;
        let numServersRunning = 0;
        let leastLatencyServerId = "";
        let leastLatency = 1000000;
        let leastLatencyWithPlayersServerId = "";
        let leastLatencyWithPlayers = 1000000;

        // Otherwise try all available servers.
        ClientManager.getAvailableServerStats(function(success, serverId, latency, gameCount, playerCount, message) {
            // Count that we got a response.
            numServerResponses++;

            ClientManager.log.debug("Received response from " + serverId + " (" + numServerResponses + "/" + numAvailableServers + ")");

            if (success) {
                // Enable server.
                TankTrouble.SettingsBox.enableServer(serverId, latency);

                // Count that we found a server which was running.
                numServersRunning++;

                if (latency < leastLatency) {
                    leastLatency = latency;
                    leastLatencyServerId = serverId;
                }
                if (playerCount > 0) {
                    if (latency < leastLatencyWithPlayers) {
                        leastLatencyWithPlayers = latency;
                        leastLatencyWithPlayersServerId = serverId;
                    }
                }
            } else {
                // Disable server.
                TankTrouble.SettingsBox.disableServer(serverId);
            }

            // Check if this was the last server responding.
            if (numServerResponses === numAvailableServers) {
                // Check if the client connected while querying servers.
                if (ClientManager.client.getState() === TTClient.STATES.UNCONNECTED) {
                    if (numServersRunning > 0) {
                        // If at least one server is running, connect to the lobby of the server with least latency.
                        // Connect to a server with players if latency is not significantly poorer than the one potentially without.

                        let bestServerId = leastLatencyServerId;

                        if (leastLatencyWithPlayers < leastLatency + Constants.CLIENT.MAX_LATENCY_DIFFERENCE_TO_ACCEPT_FOR_POPULATED_SERVER) {
                            bestServerId = leastLatencyWithPlayersServerId;
                        }

                        // Store this server for next time.
                        Cookies.set('multiplayerserverid', bestServerId, {expires: 365});
                        ClientManager.multiplayerServerId = bestServerId;

                        // Set the server selection box.
                        TankTrouble.SettingsBox.setServer(bestServerId);

                        ClientManager.log.debug("Find and connect to best available server resulted in new connect");

                        // Connect.
                        ClientManager.client.connect(ClientManager.availableServers[bestServerId].url);
                    } else {
                        // Try again after a few seconds.
                        ClientManager.log.debug("Failed to find any server. Attempting again in a few seconds");
                        // Clear any existing time out.
                        if (ClientManager.reconnectTimeout) {
                            clearTimeout(ClientManager.reconnectTimeout);
                        }
                        ClientManager.reconnectTimeout = setTimeout(ClientManager._findAndConnectToBestAvailableServer, Constants.CLIENT.RECONNECT_INTERVAL);
                    }
                } else {
                    ClientManager.log.debug("Client connected while querying available servers");
                }
            }
        });
    },

    _sendMessageToServer: function(serverId, msg, timeout) {
        // Create a local scope for operating on serverId
        (function(serverId) {
            const availableServer = ClientManager.availableServers[serverId];

            if (!availableServer) {
                return;
            }
            ClientManager.log.debug("Sending message " + msg + " to " + serverId);

            // Create a new socket
            const socket = new WebSocket(availableServer.url);

            socket.onopen = function(event) {
                try {
                    socket.send(msg.pack());
                    setTimeout(function() {
                        socket.close();
                    }, timeout);
                } catch (e) {
                    ClientManager.log.error("Failed to send message on connection: " + e.message);
                }
            };
        })(serverId);
    },

    broadcastUpdateUserByAdmin: function(adminId, playerId, iconChanged, usernameChanged, contentChanged) {
        const adminToken = Users.getAuthenticatedMultiplayerToken(adminId);

        const msg = PlayerUpdatedByAdminMessage.create();
        msg.setAdminId(adminId);
        msg.setToken(adminToken);
        msg.setPlayerId(playerId);
        msg.setIconChanged(iconChanged);
        msg.setUsernameChanged(usernameChanged);
        msg.setContentChanged(contentChanged);

        const serverIds = Object.keys(ClientManager.availableServers);
        // Generate a socket for each available server
        ClientManager.log.debug("Broadcasting update user by admin");
        for (let i = 0;i<serverIds.length;i++) {
            ClientManager._sendMessageToServer(serverIds[i], msg, 1000);
        }
    },

    broadcastContentUpdated: function(adminId, virtualShopChanged) {
        const adminToken = Users.getAuthenticatedMultiplayerToken(adminId);

        const msg = ContentUpdatedMessage.create();
        msg.setAdminId(adminId);
        msg.setToken(adminToken);
        msg.setVirtualShopChanged(virtualShopChanged);

        const serverIds = Object.keys(ClientManager.availableServers);
        // Generate a socket for each available server
        ClientManager.log.debug("Broadcasting update content");
        for (let i = 0;i<serverIds.length;i++) {
            ClientManager._sendMessageToServer(serverIds[i], msg, 1000);
        }
    },

    broadcastPlayersBanned: function(adminId, playerIds) {
        const adminToken = Users.getAuthenticatedMultiplayerToken(adminId);

        const msg = PlayersBannedMessage.create();
        msg.setAdminId(adminId);
        msg.setToken(adminToken);
        msg.setPlayerIds(playerIds);

        const serverIds = Object.keys(ClientManager.availableServers);
        // Generate a socket for each available server
        ClientManager.log.debug("Broadcasting players banned");
        for (let i = 0;i<serverIds.length;i++) {
            ClientManager._sendMessageToServer(serverIds[i], msg, 1000);
        }
    },

    broadcastPlayersUnbanned: function(adminId, playerIds) {
        const adminToken = Users.getAuthenticatedMultiplayerToken(adminId);

        const msg = PlayersUnbannedMessage.create();
        msg.setAdminId(adminId);
        msg.setToken(adminToken);
        msg.setPlayerIds(playerIds);

        const serverIds = Object.keys(ClientManager.availableServers);
        // Generate a socket for each available server
        ClientManager.log.debug("Broadcasting players unbanned");
        for (let i = 0;i<serverIds.length;i++) {
            ClientManager._sendMessageToServer(serverIds[i], msg, 1000);
        }
    },

    _authenticationEventHandler: function(self, evt, data) {
        switch(evt) {
            case Users.EVENTS.PLAYER_AUTHENTICATED:
            {
                ClientManager.getClient().addUser(data, Users.getAuthenticatedMultiplayerToken(data));

                break;
            }
            case Users.EVENTS.PLAYER_DEAUTHENTICATED:
            {
                ClientManager.getClient().removeUser(data);

                break;
            }
            case Users.EVENTS.GUEST_ADDED:
            {
                ClientManager.getClient().addUser(data, Users.getGuestMultiplayerToken(data));

                break;
            }
            case Users.EVENTS.GUESTS_ADDED:
            {
                ClientManager.getClient().addUsers(data, Users.getGuestMultiplayerTokens(data));

                break;
            }
            case Users.EVENTS.GUEST_REMOVED:
            {
                ClientManager.getClient().removeUser(data);

                break;
            }
            case Users.EVENTS.GUEST_SIGNED_UP:
            {
                ClientManager.getClient().updateUser(data, false, true);

                break;
            }
            case Users.EVENTS.PLAYER_UPDATED:
            {
                ClientManager.getClient().updateUser(data.playerId, data.iconChanged, data.usernameChanged);

                break;
            }
        }
    },

    _chatEventHandler: function(self, evt, data) {
        switch(evt) {
            case TankTrouble.ChatBox.EVENTS.CHAT_ACTIVITY:
            {
                ClientManager.getClient().chatActivity();

                break;
            }
            case TankTrouble.ChatBox.EVENTS.GLOBAL_CHAT:
            {
                ClientManager.getClient().globalChat(data);

                break;
            }
            case TankTrouble.ChatBox.EVENTS.CHAT:
            {
                ClientManager.getClient().chat(data);

                break;
            }
            case TankTrouble.ChatBox.EVENTS.USER_CHAT:
            {
                ClientManager.getClient().userChat(data.recipientPlayerIds, data.message);

                break;
            }
            case TankTrouble.ChatBox.EVENTS.REPORT_CHAT:
            {
                ClientManager.getClient().reportChat(data);

                break;
            }
            case TankTrouble.ChatBox.EVENTS.UNDO_CHAT_REPORT:
            {
                ClientManager.getClient().undoChatReport(data);

                break;
            }
        }
    },

    _clientStateChangeHandler: function(self, oldState, newState, data, msg) {
        ClientManager.log.debug("Client state: " + newState + ": " + msg);
        switch(newState) {
            case TTClient.STATES.UNCONNECTED:
            {
                // Connect immediately if we have a newly selected server id.
                if (ClientManager.newlySelectedServerId) {
                    ClientManager.log.debug("Reconnect immediately to selected server");
                    // Attempt to connect to newly selected server.
                    ClientManager._attemptToConnectToServer(ClientManager.newlySelectedServerId);
                    // Clear value.
                    ClientManager.newlySelectedServerId = null;
                }
                // Attempt to reconnect after a few seconds.
                else if (ClientManager.multiplayerServerId) {
                    ClientManager.log.debug("Attempt to reconnect in a few seconds");
                    // Clear any existing time out.
                    if (ClientManager.reconnectTimeout) {
                        clearTimeout(ClientManager.reconnectTimeout);
                    }
                    ClientManager.reconnectTimeout = setTimeout(ClientManager._attemptToConnectToServer, Constants.CLIENT.RECONNECT_INTERVAL, ClientManager.multiplayerServerId);
                } else {
                    ClientManager.log.debug("Attempt to find a server in a few seconds");
                    // Clear any existing time out.
                    if (ClientManager.reconnectTimeout) {
                        clearTimeout(ClientManager.reconnectTimeout);
                    }
                    ClientManager.reconnectTimeout = setTimeout(ClientManager._findAndConnectToBestAvailableServer, Constants.CLIENT.RECONNECT_INTERVAL);
                }

                break;
            }
            case TTClient.STATES.CONNECTING:
            {
                // Clear reconnectTimeout.
                if (ClientManager.reconnectTimeout) {
                    ClientManager.log.debug("Clear automatic reconnect attempt");
                    clearTimeout(ClientManager.reconnectTimeout);
                    ClientManager.reconnectTimeout = null;
                }

                break;
            }
        }
    },

    _clientEventHandler: function(self, evt, data) {
        switch(evt) {
            case TTClient.EVENTS.PLAYERS_KICKED: {
                const playerIds = data.getPlayerIds();
                for (let i = 0; i < playerIds.length; ++i) {
                    if (Users.isAuthenticatedUser(playerIds[i])) {
                        // Submit deauthenticate request.
                        Backend.getInstance().deauthenticate(
                            function(result) {
                                if (typeof(result) == 'object') {
                                    // Remove deauthenticated user
                                    Users.removeAuthenticatedUser(result.playerId);
                                } else {
                                    ClientManager.log.error("Could not deauthenticate kicked player");
                                }
                            },
                            function(result) {
                            },
                            function(result) {
                            },
                            playerIds[i],
                            Caches.getEmailCache(),
                            Caches.getCurrencyCache()
                        );
                    } else {
                        // Submit delete guest request.
                        Backend.getInstance().deleteGuest(
                            function(result) {
                                if (typeof(result) == 'object') {
                                    // Remove guest user
                                    Users.removeGuestUser(result.playerId);
                                } else {
                                    ClientManager.log.error("Could not deauthenticate kicked player");
                                }
                            },
                            function (result) {
                                ClientManager.log.error(result);
                            },
                            function (result) {
                            },
                            playerIds[i],
                            Caches.getCurrencyCache()
                        );
                    }
                }

                TankTrouble.ErrorBox.show(data.getReason());

                break;
            }
            case TTClient.EVENTS.SHUTDOWN: {
                ClientManager.shutdown();
                Content.shutdown();

                OverlayManager.replacePotentialOverlay(
                    TankTrouble.MessageOverlay,
                    {
                        headline: "Site disabled",
                        message: data.getReason(),
                        canCancel: false,
                        canClose :false
                    },
                    true
                );

                if (data.getReload()) {
                    setTimeout(function() {
                        location.reload();
                    }, 7000);
                }

                break;
            }
        }
    },

    _clientErrorHandler: function(self, error, msg) {
        self.log.error("Client error: " + msg);
        TankTrouble.ErrorBox.show(msg);
    }

});
