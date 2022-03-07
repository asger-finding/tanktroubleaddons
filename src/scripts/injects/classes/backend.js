var Backend = Classy.newClass().name('Backend'); // eslint-disable-line no-var

Backend.fields({
    ajax: null
});

Backend.classFields({
    instance: undefined
});

Backend.classMethods({
    getInstance: function() {
        if (!this.instance) {
            this.instance = Backend.create();
        }

        return this.instance;
    }
});

Backend.constructor(function() {
    this.ajax = TankTrouble.Ajax;
});

Backend.methods({
    /**
     * Get AIs from server.
     * Result is an object containing AI[] on success, false on error.
     */
    getAIs: function(successfn, errorfn, completefn) {
        this.ajax.getAIs(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(false);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            }
        );
    },

    /**
     * Get player details from cache or server.
     * Result is an object containing player details on success, string on error.
     * @param playerId string
     * @param playerDetailsCache Cache The cache to use.
     */
    getPlayerDetails: function(successfn, errorfn, completefn, playerId, playerDetailsCache) {
        const cachedPlayerDetails = playerDetailsCache.get(playerId);
        if (!cachedPlayerDetails) {
            this.ajax.getPlayerDetails(
                function(result) {
                    if (result.result.result) {
                        // Update playerDetailsCache as appropriate
                        const playerDetails = PlayerDetails.withObject(result.result.data);
                        playerDetailsCache.set(playerId, playerDetails);

                        successfn(playerDetails);
                    } else {
                        successfn(playerId);
                    }
                },
                function(result) {
                    if (typeof errorfn === "function") {
                        errorfn(result.error.message);
                    }
                },
                function(result) {
                    if (typeof completefn === "function") {
                        completefn(result.result.data);
                    }
                },
                playerId
            );
        }
        else {
            successfn(cachedPlayerDetails);
            if (typeof completefn === "function") {
                completefn(cachedPlayerDetails);
            }
        }
    },

    /**
     * Get player details from cache or server.
     * Result is PlayerDetails on succcess if the player was found, string with username on success if the player was not found, string on error.
     * @param username string The username of the player.
     * @param playerDetailsCache Cache The cache to use.
     * NOTE: Only the player id of the player details can be counted on being up to date!
     * NOTE: If someone in the cache changes their username, and another user takes that username, the cache will not be updated!
     */
    getPlayerDetailsByUsername: function(successfn, errorfn, completefn, username, playerDetailsCache) {
        const cachedPlayerDetails = playerDetailsCache.get(username);
        if (!cachedPlayerDetails) {
            this.ajax.getPlayerDetailsByUsername(
                function(result) {
                    if (result.result.result) {
                        // Update playerDetailsCache as appropriate
                        const playerDetails = PlayerDetails.withObject(result.result.data);
                        playerDetailsCache.set(playerDetails.getUsername(), playerDetails);

                        successfn(playerDetails);
                    } else {
                        successfn(username);
                    }
                },
                function(result) {
                    if (typeof errorfn === "function") {
                        errorfn(result.error.message);
                    }
                },
                function(result) {
                    if (typeof completefn === "function") {
                        completefn(result.result.data);
                    }
                },
                username
            );
        }
        else {
            successfn(cachedPlayerDetails);
            if (typeof completefn === "function") {
                completefn(cachedPlayerDetails);
            }
        }
    },

    /**
     * Get player details from server.
     * Result is PlayerDetails on success if the player was found, string with email if the player was not found, string on error.
     * @param adminId string
     * @param email string The email of the player.
     */
    getPlayerDetailsByEmail: function(successfn, errorfn, completefn, adminId, email) {
        this.ajax.getPlayerDetailsByEmail(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data);
                    successfn(playerDetails);
                } else {
                    successfn(email);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            adminId,
            email
        );
    },

    /**
     * Result is a object with player details on success, a string on error.
     * @param adminId string
     * @param playerId string
     */
    getSensitivePlayerDetails: function(successfn, errorfn, completefn, adminId, playerId) {
        this.ajax.getSensitivePlayerDetails(
            function(result) {
                if (result.result.result) {
                    successfn(PlayerDetails.withObject(result.result.data));
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            adminId,
            playerId
        );
    },

    /**
     * Get email address from cache or server.
     * Only currently logged in players' emails can be retrieved.
     * @param playerId string The player id of the player.
     * @param emailCache Cache The cache to use.
     * @return string/bool If successfully found email, return string. Otherwise return false.
     */
    getEmail: function(successfn, errorfn, completefn, playerId, emailCache) {
        const cachedEmail = emailCache.get(playerId);
        if (!cachedEmail) {
            this.ajax.getEmail(
                function(result) {
                    if (result.result.result) {
                        // Update emailCache as appropriate
                        emailCache.set(playerId, result.result.data);

                        successfn(result.result.data);
                    } else {
                        successfn(false);
                    }
                },
                function(result) {
                    if (typeof errorfn === "function") {
                        errorfn(result.message);
                    }
                },
                function(result) {
                    if (typeof completefn === "function") {
                        completefn(result.result.data);
                    }
                },
                playerId
            );
        }
        else {
            successfn(cachedEmail);
            if (typeof completefn === "function") {
                completefn(cachedEmail);
            }
        }
    },

    getCurrency: function(successfn, errorfn, completefn, playerId, currencyCache) {
        const cachedCurrency = currencyCache.get(playerId);
        if (!cachedCurrency) {
            this.ajax.getCurrency(
                function(result) {
                    if (result.result.result) {
                        // Update currencyCache as appropriate
                        const currency = Currency.withObject(result.result.data);
                        currencyCache.set(playerId, currency);

                        successfn(currency);
                    } else {
                        successfn(playerId);
                    }
                },
                function(result) {
                    if (typeof errorfn === "function") {
                        errorfn(result.message);
                    }
                },
                function(result) {
                    if (typeof completefn === "function") {
                        completefn(result.result.data);
                    }
                },
                playerId
            );
        }
        else {
            successfn(cachedCurrency);
            if (typeof completefn === "function") {
                completefn(cachedCurrency);
            }
        }
    },

    /**
     * Get tutorial progress for given players
     * @param playerIds string[]
     * @return object mapping player ids to tutorial progress.
     */
    getTutorialProgress: function(successfn, errorfn, completefn, playerIds) {
        this.ajax.getTutorialProgress(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerIds
        );
    },

    /**
     * Update tutorial progress for given player
     * @param playerId string
     * @return void
     */
    updateTutorialProgress: function(successfn, errorfn, completefn, playerId) {
        this.ajax.updateTutorialProgress(
            function(result) {
                if (result.result.result) {
                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn();
                }
            },
            playerId
        );
    },

    /**
     * Result is a bool on success, a string on error.
     * @param adminId string
     * @param playerId string
     * @param playerDetailsCache Object
     */
    recommendPlayerPromotion: function(successfn, errorfn, completefn, adminId, playerId, playerDetailsCache) {
        this.ajax.recommendPlayerPromotion(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data);

                    // Overwrite the player details for this user.
                    playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);

                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerId
        );
    },

    /**
     * Result is a bool on success, a string on error.
     * @param adminId string
     * @param playerId string
     * @param adminLevel int
     * @param playerDetailsCache Object
     */
    setPlayerAdminLevel: function(successfn, errorfn, completefn, adminId, playerId, adminLevel, playerDetailsCache) {
        this.ajax.setPlayerAdminLevel(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data);

                    // Overwrite the player details for this user.
                    playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);

                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerId,
            adminLevel
        );
    },

    /**
     * Result is bool on success, string on error.
     * @param adminId string
     * @param playerId string
     * @param playerDetailsCache Object
     */
    retireAdmin: function(successfn, errorfn, completefn, adminId, playerId, playerDetailsCache) {
        this.ajax.retireAdmin(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data);

                    // Overwrite the player details for this user.
                    playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);

                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerId
        );
    },

    /**
     * @param adminId string
     * @param accept bool
     * @param playerDetailsCache Object
     * @return bool
     */
    acceptAdminGuidelines: function(successfn, errorfn, completefn, adminId, accept, playerDetailsCache) {
        this.ajax.acceptAdminGuidelines(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data);

                    // Overwrite the player details for this user.
                    playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);
                }
                successfn(result.result.result);
            },
            errorfn,
            completefn,
            adminId,
            accept
        );
    },

    /**
     * Get temp ban validities from cache or server. If just one user is not cached, every user's information is retrieved again.
     * @param playerIds string[] The player ids to retrieve temp bans for
     * @param tempBanValidityCache Cache The cache to use.
     * @return object Mapping playerIds to newest temp ban validity.
     */
    getNewestTempBanValidities: function(successfn, errorfn, completefn, playerIds, tempBanValidityCache) {
        const result = {};
        let cacheMiss = false;
        for (let i = 0; i < playerIds.length; ++i) {
            const cachedValue = tempBanValidityCache.get(playerIds[i]);
            if (cachedValue === false) {
                cacheMiss = true;
                break;
            }
            result[playerIds[i]] = cachedValue;
        }

        if (cacheMiss) {
            this.ajax.getNewestTempBanValidities(
                function(result) {
                    if (result.result.result) {
                        // Update tempBanValidityCache as appropriate
                        for (const playerId in result.result.data) {
                            tempBanValidityCache.set(playerId, result.result.data[playerId]);
                        }

                        successfn(result.result.data)
                    } else {
                        successfn(false);
                    }
                },
                function(result) {
                    if (typeof errorfn === "function") {
                        errorfn(result.message);
                    }
                },
                function(result) {
                    if (typeof completefn === "function") {
                        completefn(result.result.data);
                    }
                },
                playerIds
            );
        } else {
            successfn(result);
            if (typeof completefn === "function") {
                completefn(result);
            }
        }

    },

    /**
     * Create guest players.
     * @param numGuests int The number of guests to create.
     * @param playerDetailsCache Cache The cache to use.
     * @return string|object If successfully created guests, return object with playerIds and multiplayerTokens properties that are arrays. Otherwise, return error message.
     */
    createGuests: function(successfn, errorfn, completefn, numGuests, playerDetailsCache) {
        this.ajax.createGuests(
            function(result) {
                if (result.result.result) {
                    const playerDetailsArray = result.result.data["playerDetails"];
                    const playerIds = [];
                    for (let i = 0; i < playerDetailsArray.length; ++i) {
                        const playerDetails = PlayerDetails.withObject(playerDetailsArray[i]);

                        // Overwrite any cached player details.
                        playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);

                        playerIds.push(playerDetails.getPlayerId());
                    }

                    successfn({playerIds: playerIds, multiplayerTokens: result.result.data["multiplayerTokens"]});
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            numGuests
        );
    },

    /**
     * Sign up player.
     * @param username string The new username to assign to the player.
     * @param password string The password.
     * @param confirmPassword string The password again.
     * @param email stirng The email of the player.
     * @param playerDetailsCache Cache The cache to use.
     * @return string|object If successfully signed up player, return object with playerId and multiplayerToken properties. Otherwise return object with message and inputField properties.
     */
    signUp: function(successfn, errorfn, completefn, username, password, confirmPassword, email, termsAccepted, playerDetailsCache) {
        this.ajax.signUp(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data["playerDetails"]);

                    // Overwrite the player details for this user.
                    playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);

                    successfn({playerId: playerDetails.getPlayerId(), multiplayerToken: result.result.data["multiplayerToken"]});
                } else {
                    const messageAndInputField = {};
                    // Set focus to relevant input field based on response.result.data.
                    if (result.result.data) {
                        messageAndInputField.inputField = result.result.data["inputField"];
                    }
                    messageAndInputField.message = result.result.message;

                    successfn(messageAndInputField);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            function(result) {
            },
            username,
            password,
            confirmPassword,
            email,
            termsAccepted
        );
    },

    /**
     * Sign up guest player in place.
     * @param guestPlayerIdToSignUp string The player id of the player to sign up.
     * @param username string The new username to assign to the player.
     * @param password string The password.
     * @param confirmPassword string The password again.
     * @param email string The email of the player.
     * @param playerDetailsCache Cache The cache to use.
     * @return string|object If successfully signed up guest, return "OK". Otherwise return object with message and inputField properties.
     */
    signUpGuest: function(successfn, errorfn, completefn, guestPlayerIdToSignUp, username, password, confirmPassword, email, termsAccepted, playerDetailsCache) {
        this.ajax.signUpGuest(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data);

                    // Overwrite the player details for this user.
                    playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);

                    successfn("OK");
                } else {
                    const messageAndInputField = {};
                    // Set focus to relevant input field based on response.result.data.
                    if (result.result.data) {
                        messageAndInputField.inputField = result.result.data["inputField"];
                    }
                    messageAndInputField.message = result.result.message;

                    successfn(messageAndInputField);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            function(result) {
            },
            guestPlayerIdToSignUp,
            username,
            password,
            confirmPassword,
            email,
            termsAccepted
        );
    },

    /**
     * Authenticate player.
     * @param usernameOrEmail string The username or email.
     * @param password string The password.
     * @param playerDetailsCache Cache The cache to use.
     * @return string|object If successfully authenticated user, return object with playerId, multiplayerToken and deletionRequestRemoved properties. Otherwise, return error message.
     */
    authenticate: function(successfn, errorfn, completefn, usernameOrEmail, password, playerDetailsCache) {
        this.ajax.authenticate(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data["playerDetails"]);

                    // Overwrite any cached player details.
                    playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);

                    successfn({playerId: playerDetails.getPlayerId(), multiplayerToken: result.result.data["multiplayerToken"], deletionRequestRemoved: result.result.data["deletionRequestRemoved"]});
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            usernameOrEmail,
            password
        );
    },

    /**
     * Deauthenticate player.
     * @param playerId string The player id.
     * @param emailCache Cache The email cache to clear on success.
     * @param currencyCache Cache The currency cache to clear on success.
     * @return string|object If successfully deauthenticated user, return object with playerId. Otherwise, return error message.
     */
    deauthenticate: function(successfn, errorfn, completefn, playerId, emailCache, currencyCache) {
        this.ajax.deauthenticate(
            function(result) {
                if (result.result.result) {
                    // Clear sensitive caches.
                    emailCache.invalidate(playerId);
                    currencyCache.invalidate(playerId);

                    successfn({playerId: result.result.data});
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerId
        );
    },

    /**
     * Delete guest player.
     * @param playerId string The player id.
     * @param currencyCache Cache The currency cache to clear on success.
     * @return string|object If successfully deleted guest, return object with playerId. Otherwise, return error message.
     */
    deleteGuest: function(successfn, errorfn, completefn, playerId, currencyCache) {
        this.ajax.deleteGuest(
            function(result) {
                if (result.result.result) {
                    // Clear sensitive cache.
                    currencyCache.invalidate(playerId);

                    successfn({playerId: result.result.data});
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerId
        );
    },

    deleteUserAsAdmin: function(successfn, errorfn, completefn, adminId, playerId, playerDetailsCache, playerDetailsByUsernameCache, emailCache) {
        this.ajax.deleteUserAsAdmin(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data);

                    // Invalidate the player details for this user.
                    playerDetailsCache.invalidate(playerDetails.getPlayerId());

                    // Invalidate the player details by username for this user.
                    playerDetailsByUsernameCache.invalidate(playerDetails.getUsername());

                    // Invalidate the email for this user.
                    emailCache.invalidate(playerDetails.getPlayerId());

                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerId
        );
    },

    cancelUserDeletion: function(successfn, errorfn, completefn, adminId, playerId) {
        this.ajax.cancelUserDeletion(
            function(result) {
                if (result.result.result) {
                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerId
        );
    },

    /**
     * Update player details on server.
     * @param playerId string The player id of the player.
     * @param username string The updated username to assign to the player.
     * @param newPassword string The updated password. Can be empty.
     * @param confirmNewPassword string The updated password again. Can be empty.
     * @param email string The updated email of the player,
     * @param currentPassword string The current password of the player.
     * @param playerDetailsCache Cache The cache to use.
     * @param emailCache Cache The cache to use.
     * @param currencyCache Cache The cache to use.
     * @return string|object If successfully updated player details, return "OK". Otherwise return object with message and inputField properties.
     */
    updatePlayerDetails: function(successfn, errorfn, completefn, playerId, username, newPassword, confirmNewPassword, email, currentPassword, playerDetailsCache, emailCache, currencyCache) {
        this.ajax.updatePlayerDetails(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data);

                    // Overwrite the player details for this user.
                    playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);

                    // Invalidate the email for this user.
                    emailCache.invalidate(playerDetails.getPlayerId());

                    // Invalidate the currency for this user.
                    currencyCache.invalidate(playerDetails.getPlayerId());

                    successfn("OK");
                }
                else
                {
                    const messageAndInputField = {};
                    // Set focus to relevant input field based on response.result.data.
                    if (result.result.data) {
                        messageAndInputField.inputField = result.result.data["inputField"];
                    }
                    messageAndInputField.message = result.result.message;

                    successfn(messageAndInputField);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerId,
            username,
            newPassword,
            confirmNewPassword,
            email,
            currentPassword
        );
    },

    /**
     * Set username of player with rejected username.
     * @param playerId string The player id of the player.
     * @param username string The new username to assign to the player.
     * @param playerDetailsCache Cache The cache to use.
     * @return string|object If successfully updated username, return "OK". Otherwise return object with message and inputField properties.
     */
    setUsername: function(successfn, errorfn, completefn, playerId, username, playerDetailsCache) {
        this.ajax.setUsername(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data);

                    // Overwrite the player details for this user.
                    playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);

                    successfn("OK");
                } else {
                    const messageAndInputField = {};
                    // Set focus to relevant input field based on response.result.data.
                    if (result.result.data) {
                        messageAndInputField.inputField = result.result.data["inputField"];
                    }
                    messageAndInputField.message = result.result.message;

                    successfn(messageAndInputField);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerId,
            username
        );
    },

    /**
     * @param playerId string
     * @param email string
     * @param emailCache Cache
     * @return string|bool If successfully updated email, return "OK". Otherwise return object with message and inputField properties.
     */
    setEmail: function(successfn, errorfn, completefn, playerId, email, emailCache) {
        this.ajax.setEmail(
            function(result) {
                if (result.result.result) {
                    // Update email cache as appropriate.
                    const email = result.result.data;
                    emailCache.set(playerId, email);

                    successfn("OK");
                } else {
                    const messageAndInputField = {};
                    // Set focus to relevant input field based on response.result.data.
                    if (result.result.data) {
                        messageAndInputField.inputField = result.result.data["inputField"];
                    }
                    messageAndInputField.message = result.result.message;

                    successfn(messageAndInputField);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerId,
            email
        );
    },

    /**
     * Result is bool on success, string on error.
     * @param string
     * @param playerId string
     * @param email string|null
     * @param emailCache Cache
     */
    setEmailAsAdmin: function(successfn, errorfn, completefn, adminId, playerId, email, emailCache) {
        this.ajax.setEmailAsAdmin(
            function(result) {
                if (result.result.result) {
                    // Update email cache as appropriate.
                    const email = result.result.data;
                    emailCache.set(playerId, email);

                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            adminId,
            playerId,
            email
        );
    },

    verifyAccount: function(successfn, errorfn, completefn, playerId, token, playerDetailsCache) {
        this.ajax.verifyAccount(
            function(result) {
                if (result.result.result) {
                    // Invalidate the player details for this user.
                    playerDetailsCache.invalidate(playerId);
                }

                const headlineAndMessage = {};
                headlineAndMessage.headline = result.result.data["headline"];
                headlineAndMessage.message = result.result.data["message"];
                successfn(headlineAndMessage);
            },
            function(result) {
                if (typeof errorfn === "function") {
                    const headlineAndMessage = {headline: "Something blew up!", message: result.message};
                    errorfn(headlineAndMessage);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerId,
            token
        );
    },

    /**
     * Recover account by setting new password.
     * @param playerId string The player id of the account.
     * @param token string The token of the recovery request.
     * @param newPassword string The new password.
     * @param confirmNewPassword string The new password again.
     * @return object If successfully set new password, return object with headine and message properties. Otherwise return object with message and inputField properties.
     */
    recoverAccount: function(successfn, errorfn, completefn, playerId, token, newPassword, confirmNewPassword) {
        this.ajax.recoverAccount(
            function(result) {
                if (result.result.result) {
                    const headlineAndMessage = {};
                    headlineAndMessage.headline = result.result.data["headline"];
                    headlineAndMessage.message = result.result.data["message"];
                    successfn(headlineAndMessage);
                }
                else
                {
                    const messageAndInputField = {};
                    // Set focus to relevant input field based on response.result.data.
                    if (result.result.data) {
                        messageAndInputField.inputField = result.result.data["inputField"];
                    }
                    messageAndInputField.message = result.result.message;

                    successfn(messageAndInputField);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerId,
            token,
            newPassword,
            confirmNewPassword
        );
    },

    revertAccountChangeWithToken: function(successfn, errorfn, completefn, playerId, token, playerDetailsCache, emailCache, currencyCache) {
        this.ajax.revertAccountChangeWithToken(
            function(result) {
                if (result.result.result) {
                    // Invalidate the player details for this user.
                    playerDetailsCache.invalidate(playerId);

                    // Invalidate the email for this user.
                    emailCache.invalidate(playerId);

                    // Invalidate the currency for this user.
                    currencyCache.invalidate(playerId);
                }

                const headlineAndMessage = {};
                headlineAndMessage.headline = result.result.data["headline"];
                headlineAndMessage.message = result.result.data["message"];
                successfn(headlineAndMessage);
            },
            function(result) {
                if (typeof errorfn === "function") {
                    const headlineAndMessage = {headline: "Something blew up!", message: result.message};
                    errorfn(headlineAndMessage);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerId,
            token
        );
    },

    unsubscribeNewsletter: function(successfn, errorfn, completefn, playerId, playerDetailsCache) {
        this.ajax.unsubscribeNewsletter(
            function(result) {
                if (result.result.result) {
                    // Invalidate the player details for this user.
                    playerDetailsCache.invalidate(playerId);
                }

                const headlineAndMessage = {};
                headlineAndMessage.headline = result.result.data["headline"];
                headlineAndMessage.message = result.result.data["message"];
                successfn(headlineAndMessage);
            },
            function(result) {
                if (typeof errorfn === "function") {
                    const headlineAndMessage = {headline: "Something blew up!", message: result.message};
                    errorfn(headlineAndMessage);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerId
        );
    },

    /**
     * Get unapproved player names and correspondin player ids.
     * Result is an object containing player names and player ids on success, string on error.
     * @param limit int
     */
    getUnapprovedPlayerNames: function(successfn, errorfn, completefn, limit) {
        this.ajax.getUnapprovedPlayerNames(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            limit
        )
    },

    /**
     * Result is an int on success, string on error.
     * @param adminId string
     */
    getUnapprovedPlayerNamesCount: function(successfn, errorfn, completefn, adminId) {
        this.ajax.getUnapprovedPlayerNamesCount(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId
        )
    },

    /**
     * Set player name approval of the provided player ids.
     * Result is a bool on success, string on error.
     * @param adminId string
     * @param playerIds string[]
     * @param playerNames string[]
     * @param moderation bool|null
     * @param playerDetailsCache Object
     */
    setPlayerNamesApproved: function(successfn, errorfn, completefn, adminId, playerIds, playerNames, approved, playerDetailsCache) {
        this.ajax.setPlayerNamesApproved(
            function(result) {
                if (result.result.result) {
                    for (let i = 0; i < result.result.data.length; i++) {
                        const playerDetails = PlayerDetails.withObject(result.result.data[i]);

                        // Overwrite the player details for this user.
                        playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);
                    }
                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerIds,
            playerNames,
            approved
        );
    },

    /**
     * Set player banned of the provided player id.
     * Result is a bool on success, string on error.
     * @param adminId string
     * @param playerId string
     * @param moderation bool
     * @param playerDetailsCache Object
     */
    setPlayerBanned: function(successfn, errorfn, completefn, adminId, playerId, moderation, playerDetailsCache) {
        this.ajax.setPlayerBanned(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data);

                    // Overwrite the player details for this user.
                    playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);

                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerId,
            moderation
        );
    },

    /**
     * Reset password of given player's account.
     * Result is a bool on success, string on error.
     * @param adminId string
     * @param playerId string
     */
    resetAccountPassword: function(successfn, errorfn, completefn, adminId, playerId) {
        this.ajax.resetAccountPassword(
            function(result) {
                if (result.result.result) {
                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerId
        );
    },

    /**
     * Revert changes of provided account change id.
     * Result is bool on success, string on error.
     * @param adminId string
     * @param accountChangeId int
     * @param playerDetailsCache Object
     * @param emailCache Object
     * @param currencyCache Object
     */
    revertAccountChange: function(successfn, errorfn, completefn, adminId, accountChangeId, playerDetailsCache, emailCache, currencyCache) {
        this.ajax.revertAccountChange(
            function(result) {
                if (result.result.result) {
                    const playerDetails = PlayerDetails.withObject(result.result.data);

                    // Overwrite the player details for this user.
                    playerDetailsCache.set(playerDetails.getPlayerId(), playerDetails);

                    // Invalidate the email for this user.
                    emailCache.invalidate(playerDetails.getPlayerId());

                    // Invalidate the currency for this user.
                    currencyCache.invalidate(playerDetails.getPlayerId());

                    successfn(true);
                } else {
                    successfn(result.result.message)
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            accountChangeId
        );
    },

    /**
     * Resend verification email to player.
     * Result is a bool on success, string on error.
     * @param string adminId
     * @param string playerId
     */
    resendVerificationEmailAsAdmin: function(successfn, errorfn, completefn, adminId, playerId) {
        this.ajax.resendVerificationEmailAsAdmin(
            function(result) {
                if (result.result.result) {
                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerId
        );
    },

    getPrimaryContent: function(successfn, errorfn, completefn, tab, path) {
        this.ajax.getPrimaryContent(
            function(result) {
                successfn(result.result.data);
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            completefn,
            tab,
            path
        );
    },

    getFavourites: function(successfn, errorfn, completefn, playerId, favouritesCache) {
        const cachedFavourites = favouritesCache.get(playerId);
        if (!cachedFavourites) {
            this.ajax.getFavourites(
                function(result) {
                    if (result.result.result) {
                        // Update favouritesCache as appropriate
                        const favourites = result.result.data;
                        favouritesCache.set(playerId, favourites);

                        successfn(favourites);
                    } else {
                        successfn(result.result.message);
                    }
                },
                function(result) {
                    if (typeof errorfn === "function") {
                        errorfn(result.message);
                    }
                },
                function(result) {
                    if (typeof completefn === "function") {
                        completefn(result.result.data);
                    }
                },
                playerId
            );
        }
        else {
            successfn(cachedFavourites);
            if (typeof completefn === "function") {
                completefn(cachedFavourites);
            }
        }
    },

    setFavourited: function(successfn, errorfn, completefn, favouriteId, value, favouritesCache) {
        this.ajax.setFavourited(
            function(result) {
                if (result.result.result) {
                    // Invalidate the favourites for all users.
                    const playerIds = Users.getAllPlayerIds();
                    for (let i = 0; i < playerIds.length; ++i) {
                        favouritesCache.invalidate(playerIds[i]);
                    }

                    successfn(true);
                } else {
                    successfn(result.result.message);
                }

            },
            errorfn,
            completefn,
            favouriteId,
            value
        );
    },

	getScraps: function(successfn, errorfn, completefn, includeVelocity) {
		this.ajax.getScraps(
			function(result) {
				successfn(result.result.data);
			},
			function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
			},
			completefn,
			includeVelocity
		);
	},

	getStatistics: function(successfn, errorfn, completefn) {
		this.ajax.getStatistics(
			function(result) {
				successfn(result.result.data);
			},
			function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
			},
			completefn
		);
	},

    getGarageContent: function(successfn, errorfn, completefn, playerId, garageContentCache) {
        const cachedGarageContent = garageContentCache.get(playerId);
        if (!cachedGarageContent) {
            this.ajax.getGarageContent(
                function(result) {
                    // Update garageContentCache as appropriate
                    const garageContent = result.result.data;
                    garageContentCache.set(playerId, garageContent);

                    successfn(garageContent);
                },
                function(result) {
                    if (typeof errorfn === "function") {
                        errorfn(result.message);
                    }
                },
                function(result) {
                    if (typeof completefn === "function") {
                        completefn(result.result.data);
                    }
                },
                playerId
            );
        }
        else {
            successfn(cachedGarageContent);
            if (typeof completefn === "function") {
                completefn(cachedGarageContent);
            }
        }
    },

    setAccessory: function(successfn, errorfn, completefn, playerId, type, number, playerDetailsCache) {
        this.ajax.setAccessory(
            function(result) {
                // Invalidate playerDetailsCache
                playerDetailsCache.invalidate(playerId);

                successfn(result.result.result);
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            completefn,
            playerId,
            type,
            number
        );
    },

    setColour: function(successfn, errorfn, completefn, playerId, place, colour, playerDetailsCache) {
        this.ajax.setColour(
            function(result) {
                // Invalidate playerDetailsCache
                playerDetailsCache.invalidate(playerId);

                successfn(result.result.result);
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            completefn,
            playerId,
            place,
            colour
        );
    },

    /**
     * Get messages to and from the supplied player ids.
     * The messages are marked as seen.
     * @param playerIds string[]
     * @param offset int
     * @param limit int
     * @return array|string Returns an object containing an array of messages, total message count, and offset. Returns message as string on error.
     */
    getMessages: function(successfn, errorfn, completefn, playerIds, offset, limit) {
        this.ajax.getMessages(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            playerIds,
            offset,
            limit
        );
    },

    /**
     * Get messages starting from (and including) the oldest, unseen message.
     * The messages are marked as seen.
     * Result is an object containing an array of messages, total message count, and the oldest unseen message on success, string on error.
     * @param playerIds string[]
     * @param min int Minimum number of messages to get.
     */
    getMessagesFromOldestUnseen: function(successfn, errorfn, completefn, playerIds, min) {
        this.ajax.getMessagesFromOldestUnseen(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            playerIds,
            min
        );
    },

    /**
     * Get messages to and from the supplied player ids.
     * Result is an object containing an array of messages, total message count, and the offset on success, string on error.
     * @param adminId string
     * @param playerIds string[]
     * @param offset int
     * @param limit int
     */
    getMessagesAsAdmin: function(successfn, errorfn, completefn, adminId, playerIds, offset, limit) {
        this.ajax.getMessagesAsAdmin(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerIds,
            offset,
            limit
        );
    },

    /**
     * Get messages related to the senders of the oldest, unseen message sent to the admin id.
     * Result is an object containing an array of messages, total message count, and the oldest unseen message on success, string on error.
     * @param adminId string
     * @param min int Minimum number of messages to get.
     */
    getMessagesAsAdminFromOldestUnseen: function(successfn, errorfn, completefn, adminId, min) {
        this.ajax.getMessagesAsAdminFromOldestUnseen(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            min
        );
    },

    /**
     * Get messages related to the player ids, starting from (and including) the oldest, unseen message sent to the admin id.
     * @param adminId string
     * @param playerIds string[]
     * @param min int Minimum number of messages to get.
     * @return array|string Returns an object containing an array of messages, total message count, and the oldest unseen message. Returns message as string on error.
     */
    getMessagesAsAdminPlayerLookup: function(successfn, errorfn, completefn, adminId, playerIds, min) {
        this.ajax.getMessagesAsAdminPlayerLookup(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerIds,
            min
        );
    },

    /**
     * Get the most often sent messages and the most recent sent messages.
     * Result is an object containing an array of popular messages data, popular messages count, an array of recent messages data, and recent messages count, string on error.
     * @param adminId string
     * @param playerIds string[]
     * @param popularLimit int Number of popular messages to get.
     * @param recentLimit int Number of recent messages to get.
     */
    getPopularAndRecentMessageContent: function(successfn, errorfn, completefn, adminId, playerIds, popularLimit, recentLimit) {
        this.ajax.getPopularAndRecentMessageContent(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerIds,
            popularLimit,
            recentLimit
        );
    },

    /**
     * Result is an int on success, string on error.
     * @param recipientsIds string[]
     */
    getUnseenMessagesCount: function(successfn, errorfn, completefn, recipientIds) {
        this.ajax.getUnseenMessagesCount(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            recipientIds
        );
    },

    /**
     * Send message.
     * Result is a string on success, object on error.
     * @param senderIds string[]
     * @param recipientIds string[]
     * @param body string
     */
    sendMessage: function(successfn, errorfn, completefn, senderIds, recipientIds, body) {
        this.ajax.sendMessage(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    const messageAndElement = {};
                    // Set focus to relevant element based on response.result.data.
                    if (result.result.data) {
                        messageAndElement.element = result.result.data["element"];
                    }
                    messageAndElement.message = result.result.message;

                    successfn(messageAndElement);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            senderIds,
            recipientIds,
            body
        );
    },

    /**
     * Send message by content id.
     * Result is a bool on success, string on error.
     * @param senderIds string[]
     * @param recipientIds string[]
     * @param contentId int
     */
    sendMessageByContentId: function(successfn, errorfn, completefn, senderIds, recipientIds, contentId) {
        this.ajax.sendMessageByContentId(
            function(result) {
                if (result.result.result) {
                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            senderIds,
            recipientIds,
            contentId
        );
    },

    /**
     * Edit message content.
     * Result is a bool on success, string on error.
     * @param adminId string
     * @param id int
     * @param subject string
     * @param subject string
     */
    editMessageContent: function(successfn, errorfn, completefn, adminId, id, subject, body) {
        this.ajax.editMessageContent(
            function(result) {
                if (result.result.result) {
                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            id,
            subject,
            body
        );
    },

    /**
     * Mark message as seen.
     * Result is a bool on success, string on error.
     * @param messageIds int[]
     * @param playerIds string[]
     */
    markMessagesAsSeen: function(successfn, errorfn, completefn, messageIds, recipientIds) {
        this.ajax.markMessagesAsSeen(
            function(result) {
                if (result.result.result) {
                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            messageIds,
            recipientIds
        );
    },

    getForumThreads: function(successfn, errorfn, completefn, timeStamp, pinned, direction, offset, limit) {
        this.ajax.getForumThreads(
            successfn,
            errorfn,
            completefn,
            timeStamp,
            pinned,
            direction,
            offset,
            limit
		);
    },

    getForumThreadsById: function(successfn, errorfn, completefn, threadId, limit) {
        this.ajax.getForumThreadsById(
            successfn,
            errorfn,
            completefn,
            threadId,
            limit
        );
    },

    getForumReplies: function(successfn, errorfn, completefn, threadId, replyId, direction, offset, limit) {
        this.ajax.getForumReplies(
            successfn,
            errorfn,
            completefn,
            threadId,
            replyId,
            direction,
            offset,
            limit
        );
    },

    createForumThread: function(successfn, errorfn, completefn, header, message, playerDetailsCache) {
        this.ajax.createForumThread(
            function(result) {
                if (result.result.result) {
                    // Invalidate the player details for all authenticated users.
                    const playerIds = Users.getAuthenticatedPlayerIds();
                    for (let i = 0; i < playerIds.length; ++i) {
                        playerDetailsCache.invalidate(playerIds[i]);
                    }

                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            header,
            message
        );
    },

    editForumThread: function(successfn, errorfn, completefn, threadId, header, message) {
        this.ajax.editForumThread(
            successfn,
            errorfn,
            completefn,
            threadId,
            header,
            message
        );
    },

    createForumReply: function(successfn, errorfn, completefn, threadId, message, playerDetailsCache) {
        this.ajax.createForumReply(
            function(result) {
                if (result.result.result) {
                    // Invalidate the player details for all authenticated users.
                    const playerIds = Users.getAuthenticatedPlayerIds();
                    for (let i = 0; i < playerIds.length; ++i) {
                        playerDetailsCache.invalidate(playerIds[i]);
                    }

                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            threadId,
            message
        );
    },

    editForumReply: function(successfn, errorfn, completefn, threadId, replyId, message) {
        this.ajax.editForumReply(
            successfn,
            errorfn,
            completefn,
            threadId,
            replyId,
            message
        );
    },


    setForumReplyApproved: function(successfn, errorfn, completefn, threadId, replyId, value) {
        this.ajax.setForumReplyApproved(
            successfn,
            errorfn,
            completefn,
            threadId,
            replyId,
            value
        );
    },

    setForumReplyDeleted: function(successfn, errorfn, completefn, threadId, replyId, value) {
        this.ajax.setForumReplyDeleted(
            successfn,
            errorfn,
            completefn,
            threadId,
            replyId,
            value
        );
    },

    setForumReplyBanned: function(successfn, errorfn, completefn, threadId, replyId, value) {
        this.ajax.setForumReplyBanned(
            successfn,
            errorfn,
            completefn,
            threadId,
            replyId,
            value
        );
    },

    setForumReplyLiked: function(successfn, errorfn, completefn, threadId, replyId, value) {
        this.ajax.setForumReplyLiked(
            successfn,
            errorfn,
            completefn,
            threadId,
            replyId,
            value
        );
    },

    setForumThreadApproved: function(successfn, errorfn, completefn, threadId, value) {
        this.ajax.setForumThreadApproved(
            successfn,
            errorfn,
            completefn,
            threadId,
            value
        );
    },

    setForumThreadLocked: function(successfn, errorfn, completefn, threadId, value) {
        this.ajax.setForumThreadLocked(
            successfn,
            errorfn,
            completefn,
            threadId,
            value
        );
    },

    setForumThreadPinned: function(successfn, errorfn, completefn, threadId, value) {
        this.ajax.setForumThreadPinned(
            successfn,
            errorfn,
            completefn,
            threadId,
            value
        );
    },

    setForumThreadBanned: function(successfn, errorfn, completefn, threadId, value) {
        this.ajax.setForumThreadBanned(
            successfn,
            errorfn,
            completefn,
            threadId,
            value
        );
    },

    setForumThreadDeleted: function(successfn, errorfn, completefn, threadId, value) {
        this.ajax.setForumThreadDeleted(
            successfn,
            errorfn,
            completefn,
            threadId,
            value
        );
    },

    setForumThreadLiked: function(successfn, errorfn, completefn, threadId, value) {
        this.ajax.setForumThreadLiked(
            successfn,
            errorfn,
            completefn,
            threadId,
            value
        );
    },

    /**
     * Result is a chat message on success, string on error.
     * @param adminId int
     * @param id int
     */
    getChatMessageById: function(successfn, errorfn, completefn, adminId, id) {
        this.ajax.getChatMessageById(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            id
        );
    },

    /**
     * Result is an object containg chat messages and count on success, string on error.
     * @param adminId string
     * @param playerIds string[]
     * @param offset int
     * @param limit int
     */
    getChatMessagesByPlayerIds: function(successfn, errorfn, completefn, adminId, playerIds, offset, limit) {
        this.ajax.getChatMessagesByPlayerIds(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            playerIds,
            offset,
            limit
        );
    },

    /**
     * Result is an object containg chat messages and count on success, string on error.
     * @param adminId string
     * @param minTime int
     * @param maxTime int
     * @param serverName string
     * @param gameId string
     */
    getChatMessagesByTime: function(successfn, errorfn, completefn, adminId, minTime, maxTime, serverName, gameId) {
        this.ajax.getChatMessagesByTime(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            minTime,
            maxTime,
            serverName,
            gameId
        );
    },

    /**
     * Result is an object containing chat messages on success, string on error.
     * @param adminId string
     */
    getUnmoderatedChatMessages: function(successfn, errorfn, completefn, adminId) {
        this.ajax.getUnmoderatedChatMessages(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId
        );
    },

    /**
     * Result is an int on success, string on error.
     * @param adminId string
     */
    getUnmoderatedChatMessagesCount: function(successfn, errorfn, completefn, adminId) {
        this.ajax.getUnmoderatedChatMessagesCount(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId
        )
    },

    /**
     * Result is an object containg chat message, banned player ids and unbanned player ids on success, string on error.
     * @param adminId string
     * @param chatMessageId int
     * @param approved bool
     * @param tempBanValidityCache Object
     */
    setChatMessageApproved: function(successfn, errorfn, completefn, adminId, chatMessageId, approved, tempBanValidityCache) {
        this.ajax.setChatMessageApproved(
            function(result) {
                if (result.result.result) {
                    const bannedPlayerIds = result.result.data.bannedPlayerIds;
                    if (Array.isArray(bannedPlayerIds)) {
                        // Clear existing cached temp ban validities.
                        for (let i = 0; i < bannedPlayerIds.length; ++i) {
                            tempBanValidityCache.invalidate(
                                bannedPlayerIds[i]
                            );
                        }
                    }

                    const unbannedPlayerIds = result.result.data.unbannedPlayerIds;
                    if (Array.isArray(unbannedPlayerIds)) {
                        // Clear existing cached temp ban validities.
                        for (let i = 0; i < unbannedPlayerIds.length; ++i) {
                            tempBanValidityCache.invalidate(
                                unbannedPlayerIds[i]
                            );
                        }
                    }

                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            chatMessageId,
            approved
        );
    },

    getNewsPosts: function(successfn, errorfn, completefn) {
        this.ajax.getNewsPosts(
            successfn,
            errorfn,
            completefn
        );
    },

    getNewsPostById: function(successfn, errorfn, completefn, id) {
        this.ajax.getNewsPostById(
            successfn,
            errorfn,
            completefn,
            id
        );
    },

    getNewsPostPlaceholder: function(successfn, errorfn, completefn) {
        this.ajax.getNewsPostPlaceholder(
            successfn,
            errorfn,
            completefn
        );
    },

    createNewsPost: function(successfn, errorfn, completefn, time, expiration, teaser, title, content, type, styles, script, teaserScript) {
        this.ajax.createNewsPost(
            successfn,
            errorfn,
            completefn,
            time,
            expiration,
            teaser,
            title,
            content,
            type,
            styles,
            script,
            teaserScript
        );
    },

    editNewsPost: function(successfn, errorfn, completefn, id, time, expiration, teaser, title, content, type, styles, script, teaserScript) {
        this.ajax.editNewsPost(
            successfn,
            errorfn,
            completefn,
            id,
            time,
            expiration,
            teaser,
            title,
            content,
            type,
            styles,
            script,
            teaserScript
        );
    },

    deleteNewsPost: function(successfn, errorfn, completefn, id) {
        this.ajax.deleteNewsPost(
            successfn,
            errorfn,
            completefn,
            id
        );
    },

    getUploadedImages: function(successfn, errorfn, completefn) {
        this.ajax.getUploadedImages(
            successfn,
            errorfn,
            completefn
        );
    },

    getUploadedImage: function(successfn, errorfn, completefn, id) {
        this.ajax.getUploadedImage(
            successfn,
            errorfn,
            completefn,
            id
        );
    },

    deleteUploadedImage: function(successfn, errorfn, completefn, id) {
        this.ajax.deleteUploadedImage(
            successfn,
            errorfn,
            completefn,
            id
        );
    },

    getAchievements: function(successfn, errorfn, completefn, playerId) {
        this.ajax.getAchievements(
            successfn,
            errorfn,
            completefn,
            playerId
        );
    },

    getUnlockedAchievement: function(successfn, errorfn, completefn, playerId, achievementId) {
        this.ajax.getUnlockedAchievement(
            successfn,
            errorfn,
            completefn,
            playerId,
            achievementId
        );
    },

    getUnseenAchievements: function(successfn, errorfn, completefn, playerId, unseenAchievementsCache) {
        const cachedUnseenAchievements = unseenAchievementsCache.get(playerId);
        if (!cachedUnseenAchievements) {
            this.ajax.getUnseenAchievements(
                function(result) {
                    if (result.result.result) {
                        // Update unseenAchievementsCache as appropriate
                        const unseenAchievements = result.result.data;
                        unseenAchievementsCache.set(playerId, unseenAchievements);
                        successfn(unseenAchievements);
                    } else {
                        successfn(result.result.message);
                    }
                },
                function(result) {
                    if (typeof errorfn === "function") {
                        errorfn(result.message);
                    }
                },
                function(result) {
                    if (typeof completefn === "function") {
                        completefn(result.result.data);
                    }
                },
                playerId
            );
        }
        else {
            successfn(cachedUnseenAchievements);
            if (typeof completefn === "function") {
                completefn(cachedUnseenAchievements);
            }
        }
    },

    markAchievementAsSeen: function(successfn, errorfn, completefn, playerId, achievementId, unseenAchievementsCache) {
        this.ajax.markAchievementAsSeen(
            function(result) {
                if (result.result.result) {
                    // Invalidate the unseen achievements for player.
                    unseenAchievementsCache.invalidate(playerId);

                    successfn(result.result.result);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            playerId,
            achievementId
        );
    },

    getVirtualShopItems: function(successfn, errorfn, completefn, playerId, virtualShopCache) {
        const cachedVirtualShopItems = virtualShopCache.get(playerId);
        if (!cachedVirtualShopItems) {
            this.ajax.getVirtualShopItems(
                function(result) {
                    if (result.result.result) {
                        // Update virtualShopCache as appropriate
                        const virtualShopItems = result.result.data;
                        virtualShopCache.set(playerId, virtualShopItems);
                        successfn(virtualShopItems);
                    } else {
                        successfn(result.result.message);
                    }
                },
                function(result) {
                    if (typeof errorfn === "function") {
                        errorfn(result.message);
                    }
                },
                function(result) {
                    if (typeof completefn === "function") {
                        completefn(result.result.data);
                    }
                },
                playerId
            );
        }
        else {
            successfn(cachedVirtualShopItems);
            if (typeof completefn === "function") {
                completefn(cachedVirtualShopItems);
            }
        }
    },

    getVirtualShopItemsAsAdmin: function(successfn, errorfn, completefn, adminId, playerId) {
        this.ajax.getVirtualShopItemsAsAdmin(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            adminId,
            playerId
        );
    },

    getVirtualShopItemDetails: function(successfn, errorfn, completefn, playerId, itemId) {
        this.ajax.getVirtualShopItemDetails(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerId,
            itemId
        );
    },

    getVirtualShopItemDetailsAsAdmin: function(successfn, errorfn, completefn, adminId, itemId) {
        this.ajax.getVirtualShopItemDetailsAsAdmin(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            itemId
        );
    },

    editVirtualShopItem: function(successfn, errorfn, completefn, adminId, id, name, quantity, description, priceGold, priceDiamonds, availability, visibility, durationStart, durationEnd, virtualShopCache) {
        this.ajax.editVirtualShopItem(
            function(result) {
                if (result.result.result) {

                    // Invalidate entire virtual shop cache.
                    virtualShopCache.invalidateAll();

                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            id,
            name,
            quantity,
            description,
            priceGold,
            priceDiamonds,
            availability,
            visibility,
            durationStart,
            durationEnd
        );
    },

    purchaseVirtualShopItem: function(successfn, errorfn, completefn, playerId, itemId, currencyCache, virtualShopCache, garageContentCache) {
        this.ajax.purchaseVirtualShopItem(
            function(result) {
                if (result.result.result) {
                    // Invalidate the currency for player.
                    currencyCache.invalidate(playerId);

                    // Invalidate the virtual shop for player.
                    virtualShopCache.invalidate(playerId);

                    // Invalidate the garage content for player.
                    garageContentCache.invalidate(playerId);

                    successfn(result.result.result);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            playerId,
            itemId
        );
    },

    purchaseVirtualShopItemAsAdmin: function(successfn, errorfn, completefn, adminId, playerId, itemId, virtualShopCache, garageContentCache) {
        this.ajax.purchaseVirtualShopItemAsAdmin(
            function(result) {
                if (result.result.result) {
                    // Invalidate the virtual shop for player.
                    virtualShopCache.invalidate(playerId);

                    // Invalidate the garage content for player.
                    garageContentCache.invalidate(playerId);

                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            adminId,
            playerId,
            itemId
        );
    },

    /**
     * Result is bool on success, string on error.
     * @param adminId string
     * @param playerId string
     * @param purchaseId int
     * @param currencyCache Object
     * @param virtualShopCache Object
     * @param garageContentCache Object
     */
    refundVirtualPurchase: function(successfn, errorfn, completefn, adminId, playerId, purchaseId, currencyCache, virtualShopCache, garageContentCache) {
        this.ajax.refundVirtualPurchase(
            function(result) {
                if (result.result.result) {
                    // Invalidate the currency for player.
                    currencyCache.invalidate(playerId);

                    // Invalidate the virtual shop for player.
                    virtualShopCache.invalidate(playerId);

                    // Invalidate the garage content for player.
                    garageContentCache.invalidate(playerId);

                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            purchaseId
        );
    },

    getShopItems: function(successfn, errorfn, completefn) {
        this.ajax.getShopItems(
            successfn,
            errorfn,
            completefn
        );
    },

    getShopItemsAsAdmin: function(successfn, errorfn, completefn, adminId, playerId) {
        this.ajax.getShopItemsAsAdmin(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            adminId,
            playerId
        );
    },

    getShopItemDetails: function(successfn, errorfn, completefn, itemId) {
        this.ajax.getShopItemDetails(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            itemId
        );
    },

    getShopItemDetailsAsAdmin: function(successfn, errorfn, completefn, adminId, itemId) {
        this.ajax.getShopItemDetailsAsAdmin(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            adminId,
            itemId
        );
    },

    getShopItemPurchaseDetails: function(successfn, errorfn, completefn, playerId, itemId, itemOption) {
        this.ajax.getShopItemPurchaseDetails(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerId,
            itemId,
            itemOption
        );
    },

    purchaseShopItem: function(successfn, errorfn, completefn, playerId, itemId, itemOption, name, paymentId, playerDetailsCache, currencyCache, virtualShopCache, garageContentCache) {
        this.ajax.purchaseShopItem(
            function(result) {
                if (result.result.result) {
                    if (result.result.data['clientSecret']) {
                        successfn(result.result.data['clientSecret']);
                    } else {
                        // Invalidate the player details for player.
                        playerDetailsCache.invalidate(playerId);

                        // Invalidate the currency for player.
                        currencyCache.invalidate(playerId);

                        // Invalidate the virtual shop for player.
                        virtualShopCache.invalidate(playerId);

                        // Invalidate the garage content for player.
                        garageContentCache.invalidate(playerId);

                        successfn(result.result.result);
                    }
                } else {
                    const messageAndInputField = {};
                    // Set focus to relevant input field based on response.result.data.
                    if (result.result.data) {
                        messageAndInputField.inputField = result.result.data["inputField"];
                    }
                    messageAndInputField.message = result.result.message;

                    successfn(messageAndInputField);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            playerId,
            itemId,
            itemOption,
            name,
            paymentId
        );
    },

    purchaseShopItemAsAdmin: function(successfn, errorfn, completefn, adminId, playerId, itemId, itemOption, playerDetailsCache, currencyCache, virtualShopCache, garageContentCache) {
        this.ajax.purchaseShopItemAsAdmin(
            function(result) {
                if (result.result.result) {
                    // Invalidate the player details for player.
                    playerDetailsCache.invalidate(playerId);

                    // Invalidate the currency for player.
                    currencyCache.invalidate(playerId);

                    // Invalidate the virtual shop for player.
                    virtualShopCache.invalidate(playerId);

                    // Invalidate the garage content for player.
                    garageContentCache.invalidate(playerId);

                    successfn(result.result.result);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            adminId,
            playerId,
            itemId,
            itemOption
        );
    },

    /**
     * Result is bool on success, string on error.
     * @param adminId string
     * @param playerId string
     * @param purchaseId int
     * @param playerDetailsCache Object
     * @param currencyCache Object
     * @param virtualShopCache Object
     * @param garageContentCache Object
     */
    refundPurchase: function(successfn, errorfn, completefn, adminId, playerId, purchaseId, playerDetailsCache, currencyCache, virtualShopCache, garageContentCache) {
        this.ajax.refundPurchase(
            function(result) {
                if (result.result.result) {
                    // Invalidate the player details for player.
                    playerDetailsCache.invalidate(playerId);

                    // Invalidate the currency for player.
                    currencyCache.invalidate(playerId);

                    // Invalidate the virtual shop for player.
                    virtualShopCache.invalidate(playerId);

                    // Invalidate the garage content for player.
                    garageContentCache.invalidate(playerId);

                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            purchaseId
        );
    },

    getGoldShopItems: function(successfn, errorfn, completefn) {
        this.ajax.getGoldShopItems(
            successfn,
            errorfn,
            completefn
        );
    },

    getGoldShopItemsAsAdmin: function(successfn, errorfn, completefn, adminId, playerId) {
        this.ajax.getGoldShopItemsAsAdmin(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            adminId,
            playerId
        );
    },

    getGoldShopItemAsAdmin: function(successfn, errorfn, completefn, adminId, playerId, itemId) {
        this.ajax.getGoldShopItemAsAdmin(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            adminId,
            playerId,
            itemId
        );
    },

    purchaseGoldShopItem: function(successfn, errorfn, completefn, playerId, itemId, currencyCache, virtualShopCache) {
        this.ajax.purchaseGoldShopItem(
            function(result) {
                if (result.result.result) {
                    // Invalidate the currency for player.
                    currencyCache.invalidate(playerId);

                    // Invalidate the virtual shop for player.
                    virtualShopCache.invalidate(playerId);

                    successfn(result.result.result);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            playerId,
            itemId
        );
    },

    purchaseGoldShopItemAsAdmin: function(successfn, errorfn, completefn, adminId, playerId, itemId, currencyCache, virtualShopCache) {
        this.ajax.purchaseGoldShopItemAsAdmin(
            function(result) {
                if (result.result.result) {
                    // Invalidate the currency for player.
                    currencyCache.invalidate(playerId);

                    // Invalidate the virtual shop for player.
                    virtualShopCache.invalidate(playerId);

                    successfn(result.result.result);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            adminId,
            playerId,
            itemId
        );
    },

    /**
     * Result is bool on success, string on error.
     * @param adminId string
     * @param playerId string
     * @param purchaseId int
     * @param currencyCache Object
     * @param virtualShopCache Object
     */
    refundGoldPurchase: function(successfn, errorfn, completefn, adminId, playerId, purchaseId, currencyCache, virtualShopCache) {
        this.ajax.refundGoldPurchase(
            function (result) {
                if (result.result.result) {
                    // Invalidate the currency for player.
                    currencyCache.invalidate(playerId);

                    // Invalidate the virtual shop for player.
                    virtualShopCache.invalidate(playerId);

                    successfn(true);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            purchaseId
        );
    },

    getShopStockUpOptions: function(successfn, errorfn, completefn, playerId, missingGold, missingDiamonds) {
        this.ajax.getShopStockUpOptions(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            errorfn,
            completefn,
            playerId,
            missingGold,
            missingDiamonds
        );
    },

    /**
     * Result is an object containing Adminlog[] on success, a string on error.
     * @param adminId string
     * @param adminIds string[]|null
     * @param actions string[]|null
     * @param targetIds string[]|null
     * @param afterTime int|null
     * @param offset int
     * @param limit int
     */
    getAdminLogs: function(successfn, errorfn, completefn, adminId, adminIds, actions, targetIds, afterTime, offset, limit) {
        this.ajax.getAdminLogs(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            adminIds,
            actions,
            targetIds,
            afterTime,
            offset,
            limit
        );
    },

    /**
     * Resut is an object containing various statistics on success, string on error.
     * @param adminId string
     * @param minTime int|null Unix time in seconds.
     * @param maxTime int|null Unix time in seconds.
     */
    getAdminStatistics: function(successfn, errorfn, completefn, adminId, minTime, maxTime) {
        this.ajax.getAdminStatistics(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(result.result.message);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.error.message);
                }
            },
            completefn,
            adminId,
            minTime,
            maxTime
        );
    },

    /**
     * Get admin roles assumed by the given player ids.
     * Only currently logged in players' admin roles can be retrieved.
     * @param playerIds string[] The player ids to retrieve admin roles for.
     * @return Object[] If successful, return array of admin roles objects. Otherwise return false.
     */
    getAdminRoles: function(successfn, errorfn, completefn, playerIds) {
        this.ajax.getAdminRoles(
            function(result) {
                if (result.result.result) {
                    successfn(result.result.data);
                } else {
                    successfn(false);
                }
            },
            function(result) {
                if (typeof errorfn === "function") {
                    errorfn(result.message);
                }
            },
            function(result) {
                if (typeof completefn === "function") {
                    completefn(result.result.data);
                }
            },
            playerIds
        );
    },

    searchServerLogEntries: function(successfn, errorfn, completefn, adminId, query, offset, limit) {
        this.ajax.searchServerLogEntries(function(result) {
            if (result.result.result) {
                successfn(result.result.data);
            } else {
                successfn(result.result.message);
            }
        },
        errorfn,
        completefn,
        adminId,
        query,
        offset,
        limit
        );
    }
});
