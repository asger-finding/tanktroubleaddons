/**
 * This class implements the TankTrouble multiplayer client code to be used client side
 * (in a browser).
 *
 * The TTClient class acts as a state machine, with the following states:
 *
 * TTClient.STATES = {
 *   UNCONNECTED: "unconnected",
 *   CONNECTING: "connecting",
 *   CONNECTED: "connected",
 *   HANDSHAKED: "handshaked",
 *   AUTHENTICATED: "authenticated"
 * }
 *
 * Listeners are notified of state changes, errors as well as constious events
 * of general interest, such as:
 * - The list of available games has been updated
 *
 * The TTClient class is used like this (please note parameters accepted by
 * callback functions):
 *
 * const c = TTClient.create('ws://localhost:12345/');
 * c.addErrorListener(function(error, message) { ... });
 * c.addStateChangeListener(function(oldState, newState, data, message) { ... });
 * c.addEventListener(function(event, data) { ... });
 * c.connect();
 * ...
 *
 */

var TTClient = Classy.newClass().name('TTClient'); // eslint-disable-line no-var

TTClient.classFields({
    log: null
});

TTClient.fields({
    id: '',
    version: '',
    gameManager: null,
    focusManager: null,
    playerDetailsCache: null,
    currencyCache: null,
    virtualShopCache: null,
    tempBanValidityCache: null,
    garageContentCache: null,
    unseenAchievementsCache: null,
    state: null,
    socket: null,
    socketUrl: null,
    stateChangeListeners: [],
    eventListeners: [],
    errorListeners: [],
    games: [],
    gameState: null,
    expandedRoundState: null,
    playerIds: [],
    tokens: [],
    playerIdAuthenticationState: {}, // Map from player id to authentication state TTClient.PLAYER_STATES
    authenticatedPlayerIds: [],
    currentGameId: null,
    log: null,
    txCount: 0,
    rxCount: 0,
    pingInterval: null,
    lastPingTime: null,
    currentRoundtripTime: 0
});

TTClient.constructor(function(id, version, gameManager, focusManager, playerDetailsCache, currencyCache, virtualShopCache, tempBanValidityCache, garageContentCache, unseenAchievementsCache) {
    this.state = TTClient.STATES.UNCONNECTED;
    this.log = Log.create('TTClient');
    this.id = id;
    this.version = version;
    this.gameManager = gameManager;
    this.focusManager = focusManager;
    this.playerDetailsCache = playerDetailsCache;
    this.currencyCache = currencyCache;
    this.virtualShopCache = virtualShopCache;
    this.tempBanValidityCache = tempBanValidityCache;
    this.garageContentCache = garageContentCache;
    this.unseenAchievementsCache = unseenAchievementsCache;
});

TTClient.methods({

    ping: function() {
        switch (this.state) {
            case TTClient.STATES.CONNECTED:
            case TTClient.STATES.HANDSHAKED:
            case TTClient.STATES.AUTHENTICATED:
            {
                this.lastPingTime = new Date();
                const pm = PingMessage.create();
                this._send(pm);
                break;
            }
        }

    },

    addUser: function(playerId, token) {
        this.playerIds.push(playerId);
        this.tokens.push(token);
        this.playerIdAuthenticationState[playerId] = TTClient.PLAYER_STATES.NOT_AUTHENTICATED;

        // If already connected and handshaked, send authentication message with user.
        switch (this.state) {
            case TTClient.STATES.HANDSHAKED:
            case TTClient.STATES.AUTHENTICATED:
            {
                this.playerIdAuthenticationState[playerId] = TTClient.PLAYER_STATES.AUTHENTICATING;

                const msg = AuthenticateMessage.create();
                msg.setTokens([token]);
                msg.setPlayerIds([playerId]);
                this._send(msg);

                this._notifyEventListeners(TTClient.EVENTS.PLAYERS_AUTHENTICATING, [playerId]);

                break;
            }
        }
    },

    addUsers: function(playerIds, tokens) {
        for (let i = 0; i < playerIds.length; ++i) {
            this.playerIds.push(playerIds[i]);
            this.tokens.push(tokens[i]);
            this.playerIdAuthenticationState[playerIds[i]] = TTClient.PLAYER_STATES.NOT_AUTHENTICATED;
        }

        // If already connected and handshaked, send authentication message with users.
        switch (this.state) {
            case TTClient.STATES.HANDSHAKED:
            case TTClient.STATES.AUTHENTICATED:
            {
                for (let i = 0; i < playerIds.length; ++i) {
                    this.playerIdAuthenticationState[playerIds[i]] = TTClient.PLAYER_STATES.AUTHENTICATING;
                }

                const msg = AuthenticateMessage.create();
                msg.setTokens(tokens);
                msg.setPlayerIds(playerIds);
                this._send(msg);

                this._notifyEventListeners(TTClient.EVENTS.PLAYERS_AUTHENTICATING, playerIds);

                break;
            }
        }
    },

    removeUser: function(playerId) {
        for (let i = 0;i<this.authenticatedPlayerIds.length;i++) {
            if (this.authenticatedPlayerIds[i]===playerId) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                this.authenticatedPlayerIds.splice(i, 1);

                // If already authenticated, send deauthentication message with user.
                const msg = DeauthenticateMessage.create();
                msg.setPlayerIds([playerId]);
                this._send(msg);

                break;
            }
        }
        for (let i = 0;i<this.playerIds.length;i++) {
            if (this.playerIds[i]===playerId) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                this.playerIds.splice(i, 1);
                this.tokens.splice(i, 1);

                delete this.playerIdAuthenticationState[playerId];

                // If no players are left, end any existing game, and go back to handshaked state.
                if (this.playerIds.length == 0) {
                    this._endGame();
                    this._setState(TTClient.STATES.HANDSHAKED);
                }

                break;
            }
        }
    },

    replaceUser: function(playerIdToReplace, playerId, token) {
        // Most of the content of removeUser EXCEPT leaving the game if no players are left.
        for (let i = 0;i<this.authenticatedPlayerIds.length;i++) {
            if (this.authenticatedPlayerIds[i]===playerIdToReplace) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                this.authenticatedPlayerIds.splice(i, 1);

                // If already authenticated, send deauthentication message with user.
                const msg = DeauthenticateMessage.create();
                msg.setPlayerIds([playerIdToReplace]);
                this._send(msg);

                break;
            }
        }
        for (let i = 0;i<this.playerIds.length;i++) {
            if (this.playerIds[i]===playerIdToReplace) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                this.playerIds.splice(i, 1);
                this.tokens.splice(i, 1);

                delete this.playerIdAuthenticationState[playerIdToReplace];

                break;
            }
        }

        // Add replacing user as usual.
        this.addUser(playerId, token);
    },

    updateUser: function(playerId, iconChanged, usernameChanged) {
        // If authenticated, send update player info message with user.
        if (this.playerIdAuthenticationState[playerId] === TTClient.PLAYER_STATES.AUTHENTICATED) {
            const msg = PlayerUpdatedMessage.create();
            msg.setPlayerId(playerId);
            msg.setIconChanged(iconChanged);
            msg.setUsernameChanged(usernameChanged);
            msg.setContentChanged(false);
            this._send(msg);
        }
    },

    getState: function() {
        return this.state;
    },

    getSocket: function() {
        return this.socket;
    },

    getRoundTripTime: function() {
        return this.currentRoundtripTime;
    },

    connect: function(socketUrl) {
        const client = this;
        this.socketUrl = socketUrl;
        this.socket = new WebSocket(this.socketUrl);
        this.socket.binaryType = "arraybuffer";

        this._setState(TTClient.STATES.CONNECTING);

        this.socket.onmessage = function(event) {
            //client.log.debug(event.data);
            /*if (event.data.byteLength !== undefined) {
                client.rxCount += event.data.byteLength;
            } else {
                client.rxCount += event.data.length;
            }*/
            //client.log.debug("RX bytes: " + client.rxCount);
            const msg = MessageParser.parse(event.data);
            if (msg === false) {
                client.log.error("Failed to parse data as message:" + event.data);
                return;
            }

            // We have successfully parsed a message, so we need to determine what action to take

            // Handle globally valid messages here
            switch (msg.getTypeId()) {
                case PongMessage.typeId:
                {
                    client.currentRoundtripTime = (new Date() - client.lastPingTime);
                    client._notifyEventListeners(TTClient.EVENTS.ROUND_TRIP_TIME_CHANGED, client.currentRoundtripTime);
                    return;
                }
                case PingMessage.typeId:
                {
                    // Ignore on purpose.
                    return;
                }
                case ChatActivityMessage.typeId:
                {
                    client._notifyEventListeners(TTClient.EVENTS.CHAT_ACTIVITY, msg.getPlayerIds());
                    return;
                }
                case GlobalChatMessage.typeId:
                {
                    const globalChatPost = ChatPost.create(msg.getFrom(), null, msg.getMessage(), msg.getChatMessageId(), msg.getSendReceipt());
                    client._notifyEventListeners(TTClient.EVENTS.GLOBAL_CHAT_POSTED, globalChatPost);
                    return;
                }
                case ChatMessage.typeId:
                {
                    const chatPost = ChatPost.create(msg.getFrom(), null, msg.getMessage(), msg.getChatMessageId(), msg.getSendReceipt());
                    client._notifyEventListeners(TTClient.EVENTS.CHAT_POSTED, chatPost);
                    return;
                }
                case UserChatMessage.typeId:
                {
                    const userChatPost = ChatPost.create(msg.getFrom(), msg.getTo(), msg.getMessage(), msg.getChatMessageId(), msg.getSendReceipt());
                    client._notifyEventListeners(TTClient.EVENTS.USER_CHAT_POSTED, userChatPost);
                    return;
                }
                case SystemChatMessage.typeId:
                {
                    const systemChatPost = SystemChatPost.create(msg.getInvolvedPlayerIds(), msg.getMessage(), msg.getSendReceipt());
                    client._notifyEventListeners(TTClient.EVENTS.SYSTEM_CHAT_POSTED, systemChatPost);
                    return;
                }
                case ListGamesResultMessage.typeId:
                {
                    if (msg.getResult()===true) {
                        // Result data should be an array of json structures representing valid stub
                        // games
                        const resultData = msg.getResultData();
                        client.games = [];
                        for (let i = 0; i < resultData.length; i++) {
                            // Attempt to instantiate Game objects from JSON data provided
                            client.games.push(GameState.withObject(resultData[i]));
                        }
                        // Tell any listeners that game list may have changed
                        client._notifyEventListeners(TTClient.EVENTS.GAME_LIST_CHANGED);
                        return;
                    } else {
                        client._notifyErrorListeners(TTClient.ERRORS.LIST_GAMES, "Failed to retrieve games list: " + msg.getMessage());
                        return;
                    }
                }
                case DeauthenticateResultMessage.typeId:
                {
                    if (msg.getResult()===true) {
                        // Intentionally do nothing.
                        return;
                    } else {
                        client._notifyErrorListeners(TTClient.ERRORS.DEAUTHENTICATE, "Failed to deauthenticate player(s): " + msg.getMessage());
                        return;
                    }
                }
                case ReportChatResultMessage.typeId:
                {
                    // Tell any listeners that chat report was accepted.
                    client._notifyEventListeners(TTClient.EVENTS.CHAT_REPORTED, msg.getResultData());
                    return;
                }
                case UndoChatReportResultMessage.typeId:
                {
                    client._notifyEventListeners(TTClient.EVENTS.CHAT_REPORT_UNDONE, msg.getResultData());
                    return;
                }
                case PlayersBannedMessage.typeId:
                {
                    const playerIds = msg.getPlayerIds();
                    // Invalidate the temp ban cache of banned players.
                    for (let i = 0; i < playerIds.length; ++i) {
                        client.tempBanValidityCache.invalidate(playerIds[i]);
                    }
                    // Tell any listeners that players were banned.
                    client._notifyEventListeners(TTClient.EVENTS.PLAYERS_BANNED, msg.getPlayerIds());
                    return;
                }
                case PlayersUnbannedMessage.typeId:
                {
                    const playerIds = msg.getPlayerIds();
                    // Invalidate the temp ban cache of banned players.
                    for (let i = 0; i < playerIds.length; ++i) {
                        client.tempBanValidityCache.invalidate(playerIds[i]);
                    }
                    // Tell any listeners that players were banned.
                    client._notifyEventListeners(TTClient.EVENTS.PLAYERS_UNBANNED, msg.getPlayerIds());
                    return;
                }
                case PlayerUpdatedMessage.typeId:
                {
                    // Invalidate the updated player's details.
                    client.playerDetailsCache.invalidate(msg.getPlayerId());
                    if (msg.getContentChanged()) {
                        // Invalidate the updated player's currency.
                        client.currencyCache.invalidate(msg.getPlayerId());
                        // Invalidate the updated player's virtual shop.
                        client.virtualShopCache.invalidate(msg.getPlayerId());
                        // Invalidate the updated player's garage content.
                        client.garageContentCache.invalidate(msg.getPlayerId());
                    }
                    // Tell any listeners that player was updated.
                    const playerUpdate = PlayerUpdate.create(msg.getPlayerId(), msg.getIconChanged(), msg.getUsernameChanged());
                    client._notifyEventListeners(TTClient.EVENTS.PLAYER_UPDATED, playerUpdate);
                    return;
                }
                case AchievementUnlockedMessage.typeId:
                {
                    // Invalidate the virtual shop of the player.
                    client.virtualShopCache.invalidate(msg.getPlayerId());
                    // Invalidate the unseen achievements of the player.
                    client.unseenAchievementsCache.invalidate(msg.getPlayerId());
                    // Invalidate the garage content of the player.
                    client.garageContentCache.invalidate(msg.getPlayerId());
                    // Invalidate the currency of the player.
                    client.currencyCache.invalidate(msg.getPlayerId());
                    // Tell any listeners that an achievement was unlocked.
                    const achievementUnlock = AchievementUnlock.create(msg.getPlayerId(), msg.getAchievementId());
                    client._notifyEventListeners(TTClient.EVENTS.ACHIEVEMENT_UNLOCKED, achievementUnlock);
                    return;
                }
                case PlayerKickedMessage.typeId:
                {
                    client._playerKickedMessageHandler(msg);
                    return;
                }
                case ShutdownMessage.typeId:
                {
                    client._shutdownMessageHandler(msg);
                    return;
                }
                case ContentUpdatedMessage.typeId:
                {
                    if (msg.getVirtualShopChanged()) {
                        client.virtualShopCache.invalidateAll();
                    }
                    return;
                }
            }

            // Not a globally valid message, so we need to inspect current client state
            // to determine what to do
            switch (client.state) {
                case TTClient.STATES.UNCONNECTED:
                case TTClient.STATES.CONNECTING:
                {
                    client.log.error("Message of type " + msg.getTypeId() + " received while in state " + client.state + ". This should never happen.");
                    break;
                }
                case TTClient.STATES.CONNECTED:
                {
                    switch (msg.getTypeId()) {
                        case HandshakeResultMessage.typeId:
                        {
                            if (msg.getResult()===true) {
                                // The client is now handshaked.
                                client._setState(TTClient.STATES.HANDSHAKED);

                                // Send an authenticate message if someone is already logged in.
                                if (client.playerIds.length > 0) {
                                    for (let i = 0; i < client.playerIds.length; ++i) {
                                        client.playerIdAuthenticationState[client.playerIds[i]] = TTClient.PLAYER_STATES.AUTHENTICATING;
                                    }

                                    const msg = AuthenticateMessage.create();
                                    msg.setTokens(client.tokens);
                                    msg.setPlayerIds(client.playerIds);
                                    client._send(msg);

                                    client._notifyEventListeners(TTClient.EVENTS.PLAYERS_AUTHENTICATING, client.playerIds);
                                }
                            } else {
                                const shutdown = Shutdown.create(msg.getMessage(), msg.getResultData());

                                client._notifyEventListeners(TTClient.EVENTS.SHUTDOWN, shutdown);
                                // Removed since a failure to handshake will be handled by shutting the client down.
                                //client._notifyErrorListeners(TTClient.ERRORS.HANDSHAKE, "Failed to handshake: " + msg.getMessage());
                            }

                            break;
                        }
                        default:
                        {
                            client.log.error("Received message of type " + msg.getTypeId() + " while in state " + client.state + ". This should never happen");
                        }
                    }
                    break;
                }
                case TTClient.STATES.HANDSHAKED:
                {
                    switch (msg.getTypeId()) {
                        case AuthenticateResultMessage.typeId:
                        {
                            if (msg.getResult()===true) {
                                // AuthenticateResultMessage contains player details as payload data
                                // so we retrieve that here, and store player details for the authenticated
                                // player in the player details cache
                                const playerDetailsObjects = msg.getResultData();
                                const playerIds = [];

                                for (let i = 0; i < playerDetailsObjects.length; ++i) {
                                    const playerDetails = PlayerDetails.withObject(playerDetailsObjects[i]);
                                    client.playerDetailsCache.set(
                                        playerDetails.getPlayerId(),
                                        playerDetails
                                    );

                                    playerIds.push(playerDetails.getPlayerId());

                                    client.playerIdAuthenticationState[playerDetails.getPlayerId()] = TTClient.PLAYER_STATES.AUTHENTICATED;
                                    client.authenticatedPlayerIds.push(playerDetails.getPlayerId());
                                }

                                // The client is now authenticated.
                                client._setState(TTClient.STATES.AUTHENTICATED);

                                client._notifyEventListeners(TTClient.EVENTS.PLAYERS_AUTHENTICATED, playerIds);
                            } else {
                                // If authentication failed. Kick all users and log them out.
                                client._kickAllUsers();
                                client._notifyErrorListeners(TTClient.ERRORS.AUTHENTICATE, "Failed to authenticate player: " + msg.getMessage());
                            }
                            break;
                        }
                        default:
                        {
                            client.log.error("Received message of type " + msg.getTypeId() + " while in state " + client.state + ". This should never happen");
                        }
                    }
                    break;
                }
                case TTClient.STATES.AUTHENTICATED:
                {
                    switch (msg.getTypeId()) {
                        case RoundStateMessage.typeId:
                        {
                            // Handle receiving a RoundState message before going to the game state:
                            // - if the UI is not ready, it will be ignored,
                            // - but it will be stored if it is an expanded round state (containing weapons).

                            client._roundStateMessageHandler(msg);
                            break;
                        }
                        case AuthenticateResultMessage.typeId:
                        {
                            if (msg.getResult()===true) {
                                // AuthenticateResultMessage contains player details as payload data
                                // so we retrieve that here, and store player details for the authenticated
                                // player in the player details cache
                                const playerDetailsObjects = msg.getResultData();
                                const playerIds = [];

                                for (let i = 0; i < playerDetailsObjects.length; ++i) {
                                    const playerDetails = PlayerDetails.withObject(playerDetailsObjects[i]);
                                    client.playerDetailsCache.set(
                                        playerDetails.getPlayerId(),
                                        playerDetails
                                    );

                                    playerIds.push(playerDetails.getPlayerId());

                                    client.playerIdAuthenticationState[playerDetails.getPlayerId()] = TTClient.PLAYER_STATES.AUTHENTICATED;
                                    client.authenticatedPlayerIds.push(playerDetails.getPlayerId());

                                }

                                if (client.currentGameId) {
                                    const msg = JoinGameMessage.create();
                                    msg.setGameId(client.currentGameId);
                                    msg.setPlayerIds(playerIds);
                                    client._send(msg);
                                }

                                client._notifyEventListeners(TTClient.EVENTS.PLAYERS_AUTHENTICATED, playerIds);
                            } else {
                                // If authentication failed. Kick all users and log them out.
                                client._kickAllUsers();
                                client._notifyErrorListeners(TTClient.ERRORS.AUTHENTICATE, "Failed to authenticate player: " + msg.getMessage());
                            }
                            break;
                        }
                        case CreateGameResultMessage.typeId:
                        case JoinGameResultMessage.typeId:
                        {
                            if (msg.getResult()===true) {
                                // Our request to join/create a game was accepted, so change
                                // state accordingly. Detailed game state will arrive later
                                // in a separate game state message
                                client.currentGameId = msg.getResultData();

                                client._notifyEventListeners(TTClient.EVENTS.GAME_JOINED, msg.getResultData());
                            } else {
                                // Notify listeners that an error has occurred
                                if (msg.getTypeId() === CreateGameResultMessage.typeId) {
                                    client._notifyErrorListeners(TTClient.ERRORS.CREATE_GAME, "Failed to create game: " + msg.getMessage());
                                } else {
                                    client._notifyErrorListeners(TTClient.ERRORS.JOIN_GAME, "Failed to join game: " + msg.getMessage());
                                }

                                client._endGame();

                                // Update game list to ensure it is up to date.
                                client.updateGameList();
                            }
                            break;
                        }
                        case GameStateMessage.typeId:
                        {
                            // Handle receiving a GameState message before going to the game state:
                            // - if the UI is not ready, it will be ignored,
                            // - but it will be stored.

                            client._gameStateMessageHandler(msg);
                            break;
                        }
                        case TankStateMessage.typeId:
                        {
                            client._tankStateMessageHandler(msg);
                            break;
                        }
                        case LeaveGameMessage.typeId:
                        {
                            client._endGame();
                            break;
                        }
                        case LeaveGameResultMessage.typeId:
                        {
                            if (msg.getResult()===true) {
                                client._endGame();
                            } else {
                                // Notify listeners that an error has occurred.
                                // FIXME Removed since it is completely valid for the leave game request to be rejected.
                                //client._notifyErrorListeners(TTClient.ERRORS.LEAVE_GAME, "Failed to leave game: " + msg.getMessage());
                            }
                            break;
                        }
                        case CancelLeaveGameResultMessage.typeId:
                        {
                            // Intentionally do nothing.
                            break;
                        }
                        case RequestMazeResultMessage.typeId:
                        {
                            if (msg.getResult()===true) {
                                // Result data should be a json structure representing maze
                                const resultData = msg.getResultData();
                                const maze = Maze.withObject(resultData);

                                const gameController = client.gameManager.getGameController();
                                if (gameController) {
                                    gameController.setMaze(maze);
                                }
                            } else {
                                // Notify listeners that an error has occurred
                                // FIXME Removed since it causes problems with an error when a new game is started with only one player. Need to find workaround.
                                //client._notifyErrorListeners(TTClient.ERRORS.REQUEST_MAZE, "Failed to request maze: " + msg.getMessage());
                            }
                            break;
                        }
                        case RoundCreatedMessage.typeId:
                        {
                            client._roundCreatedMessageHandler(msg);
                            break;
                        }
                        case RoundStartedMessage.typeId:
                        {
                            // Update title.
                            if (!client.focusManager.isFocused()) {
                                client.focusManager.showMessageInTitle("Go!");
                            }

                            const gameController = client.gameManager.getGameController();
                            if (gameController) {
                                gameController.startRound();
                            }
                            break;
                        }
                        case CelebrationStartedMessage.typeId:
                        {
                            const gameController = client.gameManager.getGameController();
                            if (gameController) {
                                gameController.startCelebration();
                            }
                            break;
                        }
                        case CountDownMessage.typeId:
                        {
                            const gameController = client.gameManager.getGameController();
                            if (gameController) {
                                gameController.countDown(msg.getValue());
                            }
                            break;
                        }
                        case RoundEndedMessage.typeId:
                        {
                            client._roundEndedMessageHandler(msg);
                            break;
                        }
                        case StakesMessage.typeId:
                        {
                            client._stakesMessageHandler(msg);
                            break;
                        }
                        case TankDestroyedMessage.typeId:
                        {
                            client._tankDestroyedMessageHandler(msg);
                            break;
                        }
                        case TankKilledMessage.typeId:
                        {
                            client._tankKilledMessageHandler(msg);
                            break;
                        }
                        case ProjectileTimeoutMessage.typeId:
                        {
                            const gameController = client.gameManager.getGameController();
                            if (gameController) {
                                gameController.timeoutProjectile(msg.getProjectileId());
                            }
                            break;
                        }
                        case ProjectileDestroyedMessage.typeId:
                        {
                            const gameController = client.gameManager.getGameController();
                            if (gameController) {
                                gameController.destroyProjectile(msg.getProjectileId());
                            }
                            break;
                        }
                        case CollectibleDestroyedMessage.typeId:
                        {
                            client._collectibleDestroyedMessageHandler(msg);
                            break;
                        }
                        case WeaponDestroyedMessage.typeId:
                        {
                            client._weaponDestroyedMessageHandler(msg);
                            break;
                        }
                        case UpgradeDestroyedMessage.typeId:
                        {
                            client._upgradeDestroyedMessageHandler(msg);
                            break;
                        }
                        case CounterDestroyedMessage.typeId:
                        {
                            client._counterDestroyedMessageHandler(msg);
                            break;
                        }
                        case ZoneDestroyedMessage.typeId:
                        {
                            client._zoneDestroyedMessageHandler(msg);
                            break;
                        }
                        default:
                        {
                            client.log.error("Received message of type " + msg.getTypeId() + " while in state " + client.state + ". This should never happen");
                        }
                    }
                    break;
                }
                default:
                {
                    client.log.error("Unknown client state: " + client.state);
                    break;
                }
            }

        };

        this.socket.onerror = function(event) {
            client._stopPinging();

            for (let i = 0; i < client.playerIds.length; ++i) {
                client.playerIdAuthenticationState[client.playerIds[i]] = TTClient.PLAYER_STATES.NOT_AUTHENTICATED;
            }
            client.authenticatedPlayerIds = [];

            client._setState(TTClient.STATES.UNCONNECTED);
        };

        this.socket.onclose = function(event) {
            client._stopPinging();

            for (let i = 0; i < client.playerIds.length; ++i) {
                client.playerIdAuthenticationState[client.playerIds[i]] = TTClient.PLAYER_STATES.NOT_AUTHENTICATED;
            }
            client.authenticatedPlayerIds = [];

            client._setState(TTClient.STATES.UNCONNECTED);
        };

        this.socket.onopen = function(event) {
            client._startPinging();

            client._clearGame();

            // Clear local cache so any changes in other players' details while disconnected will show up.
            client.playerDetailsCache.invalidateAll();

            client._setState(TTClient.STATES.CONNECTED);

            // Send handshake message.
            const msg = HandshakeMessage.create();
            msg.setClientId(client.id);
            msg.setVersion(client.version);
            client._send(msg);
        };

        return true;
    },

    _startPinging: function() {
        // Set a timer to measure ping times at regular intervals
        if (!this.pingInterval) {
            const self = this;
            this.pingInterval = setInterval(
                function() {
                    self.ping()
                },
                5000
            );
        }
    },

    _stopPinging: function() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    },

    _clearGame: function() {
        // Clear game id and stored game state.
        this.currentGameId = null;
        this.gameState = null;
        // Clear stored round state.
        this.expandedRoundState = null;
        this.roundState = null;
    },

    _endGame: function() {
        this._clearGame();

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.endGame();
        }
    },

    _setState: function(newState, data, msg) {

        if (this.state==newState) {
            // Don't emit signals when we are changing to the state we
            // are already in
            return;
        }

        const oldState = this.state;
        this.state = newState;
        this._notifyStateChangeListeners(oldState, this.state, data, msg);
    },

    _notifyStateChangeListeners: function(oldState, newState, data, msg) {
        for (let i = 0;i<this.stateChangeListeners.length;i++) {
            this.stateChangeListeners[i].cb(this.stateChangeListeners[i].ctxt, oldState, newState, data, msg);
        }
    },

    _notifyErrorListeners: function(error, msg) {
        for (let i = 0;i<this.errorListeners.length;i++) {
            this.errorListeners[i].cb(this.errorListeners[i].ctxt, error, msg);
        }
    },

    _notifyEventListeners: function(evt, data) {
        for (let i = 0;i<this.eventListeners.length;i++) {
            this.eventListeners[i].cb(this.eventListeners[i].ctxt, evt, data);
        }
    },

    addErrorListener: function(callback, context) {
        this.errorListeners.push({cb: callback, ctxt: context});
    },

    removeErrorListener: function(callback, context) {
        for (let i = 0;i<this.errorListeners.length;i++) {
            if (this.errorListeners[i].cb===callback && this.errorListeners[i].ctxt===context) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                this.errorListeners.splice(i, 1);
                return;
            }
        }    },

    addEventListener: function(callback, context) {
        this.eventListeners.push({cb: callback, ctxt: context});
    },

    removeEventListener: function(callback, context) {
        for (let i = 0;i<this.eventListeners.length;i++) {
            if (this.eventListeners[i].cb===callback && this.eventListeners[i].ctxt===context) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                this.eventListeners.splice(i, 1);
                return;
            }
        }
    },

    addStateChangeListener: function(callback, context) {
        this.stateChangeListeners.push({cb: callback, ctxt: context});
    },

    removeStateChangeListener: function(callback, context) {
        for (let i = 0;i<this.stateChangeListeners.length;i++) {
            if (this.stateChangeListeners[i].cb===callback && this.stateChangeListeners[i].ctxt===context) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                this.stateChangeListeners.splice(i, 1);
                return;
            }
        }
    },

    disconnect: function() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    },

    _tankStateMessageHandler: function(msg) {
        const ts = msg.getTankState();

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.setTankState(ts)
        }
    },
    
    _roundStateMessageHandler: function(msg) {
        const rs = msg.getRoundState();
        if (rs.getWeaponStates().length > 0) {
            this.expandedRoundState = rs;
        }
        this.roundState = rs;

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.setRoundState(rs);
        }
    },

    _gameStateMessageHandler: function(msg) {
        const gs = msg.getGameState();
        this.gameState = gs;

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.setGameState(gs);
        }
    },

    _tankKilledMessageHandler: function(msg) {
        if (msg.getKillerPlayerId() != msg.getVictimPlayerId()) {
            // Invalidate the killer player's details.
            this.playerDetailsCache.invalidate(msg.getKillerPlayerId());
        }

        const kill = Kill.create(msg.getVictimPlayerId(), msg.getKillerPlayerId(), msg.getExperience(), msg.getDeadlyId(), msg.getDeadlyType());

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.killTank(kill);
        }
    },

    _tankDestroyedMessageHandler: function(msg) {
        const playerId = msg.getPlayerId();

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.destroyTank(playerId);
        }
    },

    _collectibleDestroyedMessageHandler: function(msg) {
        const gameController = this.gameManager.getGameController();
        if (gameController) {
            const collectible = gameController.getCollectible(msg.getCollectibleId());
            if (collectible) {
                if (collectible.getType() === Constants.COLLECTIBLE_TYPES.GOLD || collectible.getType() === Constants.COLLECTIBLE_TYPES.DIAMOND) {
                    // Invalidate the involved player's currency.
                    this.currencyCache.invalidate(msg.getPlayerId());

                    // Invalidate the involved player's virtual shop.
                    this.virtualShopCache.invalidate(msg.getPlayerId());
                }
            }

            const pickup = Pickup.create(msg.getPlayerId(), msg.getCollectibleId());

            gameController.destroyCollectible(pickup);
        }

    },

    _weaponDestroyedMessageHandler: function(msg) {
        const weaponDeactivation = WeaponDeactivation.create(msg.getWeaponId(), msg.getPlayerId());

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.destroyWeapon(weaponDeactivation);
        }
    },

    _upgradeDestroyedMessageHandler: function(msg) {
        const upgradeUpdate = UpgradeUpdate.create(msg.getUpgradeId(), msg.getPlayerId());

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.destroyUpgrade(upgradeUpdate);
        }
    },

    _counterDestroyedMessageHandler: function(msg) {
        const counterId = msg.getCounterId();

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.destroyCounter(counterId);
        }
    },

    _zoneDestroyedMessageHandler: function(msg) {
        const zoneId = msg.getZoneId();

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.destroyZone(zoneId);
        }
    },

    _roundCreatedMessageHandler: function(msg) {
        // Update title.
        if (!this.focusManager.isFocused()) {
            this.focusManager.showMessageInTitle("Ready!");
        }

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.createRound(msg.getRanked());
        }

        this.requestMaze();
    },

    _roundEndedMessageHandler: function(msg) {
        const goldAmount = msg.getVictoryGoldAmountPerWinner();
        for (let i = 0; i < msg.getWinnerPlayerIds().length; ++i) {
            const playerId = msg.getWinnerPlayerIds()[i];

            // Invalidate the winning player's details.
            this.playerDetailsCache.invalidate(playerId);

            if (goldAmount > 0) {
                // Invalidate the winning player's currency.
                this.currencyCache.invalidate(playerId);

                // Invalidate the winning player's virtual shop.
                this.virtualShopCache.invalidate(playerId);
            }
        }

        for (let i = 0; i < msg.getRankChanges().length; ++i) {
            const rankChange = msg.getRankChanges()[i];

            // Invalidate the ranked player's details.
            this.playerDetailsCache.invalidate(rankChange.playerId);
        }

        // Clear stored round state.
        this.expandedRoundState = null;
        this.roundState = null;

        // Update title.
        if (!this.focusManager.isFocused()) {
            this.focusManager.clearTitle();
        }

        const victoryAward = VictoryAward.create(msg.getWinnerPlayerIds(), msg.getVictoryExperiencePerWinner(), msg.getVictoryGoldAmountPerWinner(), msg.getRankChanges());

        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.endRound(victoryAward);
        }
    },

    _stakesMessageHandler: function(msg) {
        const gameController = this.gameManager.getGameController();
        if (gameController) {
            gameController.setStakes(msg.getStakes());
        }
    },
    
    _playerKickedMessageHandler: function(msg) {
        const playerKick = PlayerKick.create([msg.getPlayerId()], msg.getReason());
        this._notifyEventListeners(TTClient.EVENTS.PLAYERS_KICKED, playerKick);
    },
    
    _kickAllUsers: function() {
        const playerKick = PlayerKick.create(this.playerIds, true, false, "All players were kicked due to an unexpected error");
        this._notifyEventListeners(TTClient.EVENTS.PLAYERS_KICKED, playerKick);
    },

    _shutdownMessageHandler: function(msg) {
        const shutdown = Shutdown.create(msg.getReason(), false);
        this._notifyEventListeners(TTClient.EVENTS.SHUTDOWN, shutdown);
    },

    _send: function(message) {
        switch (this.state) {
            case TTClient.STATES.UNCONNECTED:
            case TTClient.STATES.CONNECTING:
            {
                return false;
            }
        }
        //this.log.debug("Sending message " + message.pack());
        try {
            const packedMessage = message.pack();

            return this.socket.send(packedMessage);
        } catch (e) {
            this.log.error("Failed to send message: " + e.message);
            return false;
        }

    },

    chatActivity: function() {
        const msg = ChatActivityMessage.create();
        msg.setPlayerIds(this.authenticatedPlayerIds);
        this._send(msg);
    },

    globalChat: function(message) {
        const msg = GlobalChatMessage.create();
        msg.setFrom(this.authenticatedPlayerIds);
        msg.setMessage(message);
        this._send(msg);
    },

    chat: function(message) {
        const msg = ChatMessage.create();
        msg.setFrom(this.authenticatedPlayerIds);
        msg.setMessage(message);
        this._send(msg);
    },

    userChat: function(recipientPlayerIds, message) {
        const msg = UserChatMessage.create();
        msg.setTo(recipientPlayerIds);
        msg.setFrom(this.authenticatedPlayerIds);
        msg.setMessage(message);
        this._send(msg);
    },
    
    reportChat: function(chatMessageId) {
        const msg = ReportChatMessage.create();
        msg.setReporters(this.authenticatedPlayerIds);
        msg.setChatMessageId(chatMessageId);
        this._send(msg);
    },
    
    undoChatReport: function(chatMessageId) {
        const msg = UndoChatReportMessage.create();
        msg.setReporters(this.authenticatedPlayerIds);
        msg.setChatMessageId(chatMessageId);
        this._send(msg);
    },
    
    updateGameList: function() {
        const listGamesMsg = ListGamesMessage.create();
        this._send(listGamesMsg);
    },

    quickjoinGame: function() {
        this.joinGame("*");
    },

    joinGame: function(gameId) {
        const msg = JoinGameMessage.create();
        msg.setGameId(gameId);
        msg.setPlayerIds(this.authenticatedPlayerIds);
        this._send(msg);
    },
    
    leaveGame: function(force) {
        const msg = LeaveGameMessage.create();
        msg.setForce(force);
        this._send(msg);
    },

    cancelLeaveGame: function() {
        const msg = CancelLeaveGameMessage.create();
        this._send(msg);
    },

    requestMaze: function() {
        const msg = RequestMazeMessage.create();
        this._send(msg);
    },

    createGame: function(ranked, gameMode) {
        const msg = CreateGameMessage.create();
        msg.setRanked(ranked);
        msg.setGameMode(gameMode);
        this._send(msg);
    },

    getAvailableGameStates: function() {
        return this.games;
    },

    getExpandedRoundState: function() {
        if (this.expandedRoundState) {
            return this.expandedRoundState;
        }
        return false;
    },

    getRoundState: function() {
        if (this.currentGameId) {
            if (this.roundState) {
                return this.roundState;
            }
            return false;
        } else {
            this.log.error("Attempt to get round state with client not in game");
            return false;
        }
    },

    getGameState: function() {
        if (this.currentGameId) {
            if (this.gameState) {
                return this.gameState;
            }
            return false;
        } else {
            this.log.error("Attempt to get game state with client not in game");
            return false;
        }
    },

    setTankState: function(tankState) {
        if (this.currentGameId) {
            const tankStateMsg = TankStateMessage.create();
            tankStateMsg.setTankState(tankState);
            this._send(tankStateMsg);
        } else {
            this.log.error("Attempt to set tank state with client not in game");
        }
    },

    getCurrentGameId: function() {
        return this.currentGameId;
    },

    getPlayerIds: function() {
        return this.playerIds;
    },

    getAuthenticatedPlayerIds: function() {
        return this.authenticatedPlayerIds;
    },

    isPlayerAuthenticating: function(playerId) {
        return this.playerIdAuthenticationState[playerId] === TTClient.PLAYER_STATES.AUTHENTICATING;
    }
});

TTClient.STATES = {
    UNCONNECTED: "unconnected",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    HANDSHAKED: "handshaked",
    AUTHENTICATED: "authenticated"
};

TTClient.PLAYER_STATES = {
    NOT_AUTHENTICATED: "not authenticated",
    AUTHENTICATING: "authenticating",
    AUTHENTICATED: "authenticated"
};

TTClient.EVENTS = {
    PLAYERS_AUTHENTICATING: "players authenticating",
    PLAYERS_AUTHENTICATED: "players authenticated",
    GAME_LIST_CHANGED: "game list changed",
    GAME_JOINED: "game joined",
    CHAT_REPORTED: "chat reported",
    CHAT_REPORT_UNDONE: "chat report undone",
    CHAT_ACTIVITY: "chat activity",
    GLOBAL_CHAT_POSTED: "global chat posted",
    CHAT_POSTED: "chat posted",
    USER_CHAT_POSTED: "user chat posted",
    SYSTEM_CHAT_POSTED: "system chat posted",
    PLAYERS_BANNED: "players banned",
    PLAYERS_UNBANNED: "players unbanned",
    PLAYER_UPDATED: "player updated",
    ACHIEVEMENT_UNLOCKED: "achievement unlocked",
    ROUND_TRIP_TIME_CHANGED: "round trip time changed",
    PLAYERS_KICKED: "players kicked",
    SHUTDOWN: "shutdown"
};

TTClient.ERRORS = {
    HANDSHAKE: "handshake",
    AUTHENTICATE: "authenticate",
    DEAUTHENTICATE: "deauthenticate",
    LIST_GAMES: "list games",
    JOIN_GAME: "join game",
    CREATE_GAME: "create game",
    LEAVE_GAME: "leave game",
    REQUEST_MAZE: "request maze"
};

if (typeof module === 'object') {
    module.exports = TTClient;
}
