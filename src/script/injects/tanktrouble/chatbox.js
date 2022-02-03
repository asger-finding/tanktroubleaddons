var TankTrouble = TankTrouble || {};

TankTrouble.ChatBox = {
    // jQuery objects.
    chat: null,
    chatContent: null,
    chatForm: null,
    chatBody: null,
    chatBodyResizeHandle: null,
    chatInput: null,
    chatStatus: null,
    chatStatusNew: null,
    
    // Other elements.
    chatAudio: null,
    
    // State.
    updateChatTimeout: null,
    resizeHandleTimeout: null,
    globalMessage: false,
    ignoredPlayerIds: [],
    ignoreeUsernames: [],
    addingToIgnoreList: false,
    recipientPlayerIds: [],
    recipientUsernames: [],
    lastPrivateSenderPlayerIds: null,
    nextZIndex: 1,
    messages: [],

    // Events.
    eventListeners: [],
    EVENTS: {
        CHAT_ACTIVITY: "chat activity",
        GLOBAL_CHAT: "global chat",
        CHAT: "chat",
        USER_CHAT: "user chat",
        REPORT_CHAT: "report chat",
        UNDO_CHAT_REPORT: "undo chat report"
    },

    init: function() {
        this.chat = $("<div id='chat'></div>")
        this.chatStatus = $("<img width='44' height='42' class='status button' src='" + g_url("assets/images/chat/chatDisabled.png") + "' srcset='" + g_url("assets/images/chat/chatDisabled@2x.png") + " 2x'/>");
        this.chatStatusNew = $("<img width='44' height='42' class='status button' src='" + g_url("assets/images/chat/newMessageMarker.png") + "' srcset='" + g_url("assets/images/chat/newMessageMarker@2x.png") + " 2x'/>");
        this.chatContent = $("<div class='content'></div>");
        this.chatForm = $("<form/>");
        this.chatInput = $("<input disabled placeholder='Signal lost' maxlength='255'/>");

        this.chatForm.append(this.chatInput);
    
        this.chatBody = $("<div class='body'></div>");
        this.chatBodyResizeHandle = $("<img class='ui-resizable-handle ui-resizable-se handle' src='" + g_url("assets/images/chat/resizeHandleBottomRight.png") + "' srcset='" + g_url("assets/images/chat/resizeHandleBottomRight@2x.png") + " 2x'/>");
        this.chatBodyResizeHandle.hide();
    
        this.chatBody.append(this.chatBodyResizeHandle);
    
        this.chatContent.append(this.chatForm);
        this.chatContent.append(this.chatBody);
    
        this.chat.append(this.chatStatus);
        this.chat.append(this.chatStatusNew);
        this.chat.append(this.chatContent);
    
        $("body").append(this.chat);
    
        const self = this;
    
        this.chatForm.submit(function(event) {
            self.sendChat();
            return false;
        });

        this.chatInput.focus(function(event) {
            self._notifyEventListeners(TankTrouble.ChatBox.EVENTS.CHAT_ACTIVITY);
            GameManager.disableGameInput();
        });

        this.chatInput.blur(function(event) {
            GameManager.enableGameInput();
        });
    
        this.chatInput.on("input", function(event) {
            self._notifyEventListeners(TankTrouble.ChatBox.EVENTS.CHAT_ACTIVITY);
            self._parseChat();
        });
    
        this.chatStatus.click(function(event) {
            if ($(this).hasClass("noclick")) {
                $(this).removeClass("noclick");
            } else {
                self.toggle();
            }
        });

        this.chatStatusNew.click(function(event) {
            if ($(this).hasClass("noclick")) {
                $(this).removeClass("noclick");
            } else {
                self.toggle();
            }
        });

        this.chat.draggable({
            scroll: false, 
            start: function(event, ui) {
                self.chatBody.addClass("dragging");
                self.chatStatus.addClass("noclick");
                self.chatStatusNew.addClass("noclick");
                self.chatBody.find("div>img").addClass("noclick");
                clearTimeout(self.resizeHandleTimeout);
                self.chatBodyResizeHandle.stop(true).show(200);
            },
            drag: function(event, ui) {
                ui.position.left = Math.max($("#content").offset().left + 34, Math.min(ui.position.left, $("#content").offset().left + $("#content").width() - 30 - self.chatBody.width()));
                ui.position.top = Math.max(20, Math.min(ui.position.top, $(window).height() - 40));
            },
            stop: function(event, ui) {
                setTimeout(function() {
                    self.chatStatus.removeClass("noclick");
                    self.chatStatusNew.removeClass("noclick");
                    self.chatBody.find("div>img").removeClass("noclick");
                }, 1);
                self.chatBody.removeClass("dragging");
                clearTimeout(self.resizeHandleTimeout);
                self.chatBodyResizeHandle.stop(true);
                self.resizeHandleTimeout = setTimeout(function() {
                    self.chatBodyResizeHandle.hide(200);
                }, 5000);
            }
        });
        
        this.chatBody.resizable({
            ghost: true,
            handles: {se: this.chatBodyResizeHandle },
            distance: 0,
            minWidth: 180,
            minHeight: 100,
            maxHeight: 500,
            start: function(event, ui) {
                ui.helper.find(".chatMessage").remove();
                ui.helper.css("border-radius", "3px");
                ui.helper.css("border", "2px dotted #aaaaaa");
                ui.helper.css("left", "-=2px");
                ui.helper.css("top", "-=2px");
                ui.originalElement.resizable("option", "maxWidth",  $("#content").offset().left + $("#content").width() - 10 - ui.position.left);
                clearTimeout(self.resizeHandleTimeout);
                self.chatBodyResizeHandle.stop(true).hide();
            },
            stop: function(event, ui) {
                self._refreshChat(true);
                clearTimeout(self.resizeHandleTimeout);
                self.chatBodyResizeHandle.stop(true).show();
                self.resizeHandleTimeout = setTimeout(function() {
                    self.chatBodyResizeHandle.hide(200);
                }, 5000);
            }
        });
        
        this.chatStatusNew.hide();
        this.chatBody.hide();

        // Initial chat position.
        this.chat.css("left", $("#content").offset().left + 34);
        this.chat.css("top", 20);
    
        this.chatAudio = new Audio(g_url('assets/audio/ChatNotification.m4a'));
    
        // Add event listeners.
        ResizeManager.addEventListener(this._resizeEventHandler, this);
        Users.addEventListener(this._authenticationEventHandler, this);
        ClientManager.getClient().addEventListener(this._clientEventHandler, this);
        ClientManager.getClient().addStateChangeListener(this._clientStateHandler, this);
    },

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
    
    toggle: function() {
        if (!this.chat.hasClass("open")) {
            this.open();
        } else {
            this.close();
        }
    },
    
    open: function() {
        this.focus();

        if (!this.chat.hasClass("open")) {
            this.chat.addClass('open');

            this.chatBody.stop(true).delay(300).fadeIn(200);//.show("slide", {direction:"up"}, 200);//
            this.chatStatusNew.hide("scale", 50);
            
            // Wait until chat body has started fading in to render messages and remove messages that are too far down the list.
            const self = this;
            this.updateChatTimeout = setTimeout(function() {self._refreshChat(false);}, 300);
        }
    },

    close: function() {
        if (this.chat.hasClass("open")) {
            this.chat.removeClass('open');
            this.blur();

            this.chatBody.stop(true).fadeOut(200);//.hide("slide", {direction:"up"}, 200);//
            
            clearTimeout(this.updateChatTimeout);
        }
    },

    focus: function() {
        if (this.chatInput.prop("disabled")) {
            return;
        }

        this.chatInput.focus();
    },
    
    blur: function() {
        this.chatInput.blur();
    },

    addRecipient: function(playerId) {
        if (this.chatInput.prop("disabled")) {
            return;
        }

        const self = this;

        // Get username from player details.
        Backend.getInstance().getPlayerDetails(
            function(result) {
                if (typeof(result) == "object") {
                    if (self.recipientUsernames.indexOf(result.getUsername()) == -1) {
                        self.chatInput.val("@" + result.getUsername() + " " + self.chatInput.val());
                        self._parseChat();
                    }
                    self.focus();
                } else {
                    self.addSystemMessage([], "Could not find user");
                }
            },
            function(result) {
            
            }, 
            function(result) {
            
            }, 
            playerId,
            Caches.getPlayerDetailsCache()
        );
    },

    addSystemMessage: function(playerIds, message) {
        if (playerIds.length > 0) {
            // Look up usernames from player ids.
            let numDetailsResponses = 0;
            const numExpectedDetailsResponses = playerIds.length;
            const usernameMap = {};
            for (let i = 0; i < playerIds.length; ++i) {
                usernameMap[playerIds[i]] = "<ERROR>";
            }

            const self = this;
            for (let i = 0; i < playerIds.length; ++i) {
                Backend.getInstance().getPlayerDetails(
                    function(result) {
                        if (typeof(result) == "object") {
                            const username = Utils.maskUnapprovedUsername(result);
                            usernameMap[result.getPlayerId()] = username;
                        }
                    }, 
                    function(result) {
            
                    }, 
                    function(result) {
                        // Count that we got a response.
                        ++numDetailsResponses;
                        // If we have them all, add the system message.
                        if (numDetailsResponses == numExpectedDetailsResponses) {
                            self._addSystemMessage(playerIds, usernameMap, message);
                        }
            
                    }, 
                    playerIds[i],
                    Caches.getPlayerDetailsCache()
                );
            }            
        } else {
            this._addSystemMessage([], undefined, message);
        }

    },

    addGlobalChatMessage: function(from, message, chatMessageId) {
        // Look up usernames from player ids.

        this._lookUpUsernamesAndAddChatMessage(from, null, false, "#68c5ff", "#333333", message, chatMessageId);
    },
    
    addChatMessage: function(from, message, chatMessageId) {
        // Look up usernames from player ids.

        this._lookUpUsernamesAndAddChatMessage(from, null, false, "#000000", "#ffffff", message, chatMessageId);
    },
    
    addUserChatMessage: function(from, to, message, chatMessageId) {
        // Check if one of the senders is a local player. If so, we also need to get the recipients usernames.
        let addRecipients = false;
        for (let i = 0; i < from.length; ++i) {
            if (Users.isAnyUser(from[i])) {
                addRecipients = true;
            }
        }

        this._lookUpUsernamesAndAddChatMessage(from, to, addRecipients, "#00ff02", "#333333", message, chatMessageId);
    },
    
    sendChat: function() {
        if (this.chatInput.prop("disabled")) {
            return;
        }

        const message = this._parseChat();

        // Look up player ids from usernames.
        if (this.ignoreeUsernames.length > 0) {
            const usernames = this.ignoreeUsernames;
            let numUsernameResponses = 0;
            const numExpectedUsernameResponses = this.ignoreeUsernames.length;
            const adminPlayerIds = [];
            const playerIdsIgnoringThemselves = [];
            const newlyChangedIgnoreePlayerIds = [];
            const playerIdMap = {};
            for (let i = 0; i < usernames.length; ++i) {
                playerIdMap[usernames[i]] = null;
            }

            const self = this;
            const correctlyCasedUsernames = [];
            for (let i = 0; i < usernames.length; ++i) {
                Backend.getInstance().getPlayerDetailsByUsername(
                    function (result) {
                        if (typeof(result) == "object") {
                            if (!Users.isAnyUser(result.getPlayerId())) {
                                playerIdMap[result.getUsername()] = result.getPlayerId();
                                if (result.getGmLevel() === null) {
                                    correctlyCasedUsernames.push(result.getUsername());
                                } else {
                                    adminPlayerIds.push(result.getPlayerId());
                                }
                            } else if (self.addingToIgnoreList) {
                                playerIdsIgnoringThemselves.push(result.getPlayerId());
                            }
                        } else {
                            self.addSystemMessage([], "Could not find user " + result);
                        }
                    },
                    function (result) {
                    },
                    function (result) {
                        // Count that we got a response.
                        ++numUsernameResponses;
                        // If we have them all, collect any player ids found and send chat message.
                        if (numUsernameResponses == numExpectedUsernameResponses) {
                            // Since the usernames typed in might be wrongly cased, we use the "normalized" usernames that get back from the backend.
                            for (let j = 0; j < correctlyCasedUsernames.length; ++j) {
                                if (playerIdMap[correctlyCasedUsernames[j]]) {
                                    if (self.addingToIgnoreList) {
                                        if (self.ignoredPlayerIds.indexOf(playerIdMap[correctlyCasedUsernames[j]]) == -1) {
                                            self.ignoredPlayerIds.push(playerIdMap[correctlyCasedUsernames[j]]);
                                            newlyChangedIgnoreePlayerIds.push(playerIdMap[correctlyCasedUsernames[j]]);
                                        }
                                    } else {
                                        if (self.ignoredPlayerIds.indexOf(playerIdMap[correctlyCasedUsernames[j]]) >= 0) {
                                            self.ignoredPlayerIds.splice(self.ignoredPlayerIds.indexOf(playerIdMap[correctlyCasedUsernames[j]]), 1);
                                            newlyChangedIgnoreePlayerIds.push(playerIdMap[correctlyCasedUsernames[j]]);
                                        }
                                    }
                                }
                            }

                            // Let players know they cannot ignore admins.
                            if (adminPlayerIds.length > 0) {
                                self.addSystemMessage(adminPlayerIds, "You cannot ignore admins ( @  )");
                            }

                            // Mock the players ignoring themselves.
                            if (playerIdsIgnoringThemselves.length > 0) {
                                self.addSystemMessage(playerIdsIgnoringThemselves, "It's not healthy to ignore [yourself,|yourselves,] @ ");
                            }

                            if (newlyChangedIgnoreePlayerIds.length > 0) {
                                if (self.addingToIgnoreList) {
                                    self.addSystemMessage(newlyChangedIgnoreePlayerIds, "You are now ignoring @ ");
                                } else {
                                    self.addSystemMessage(newlyChangedIgnoreePlayerIds, "You can now hear @  again");
                                }
                            }

                            self.chatInput.val("");
                            self.blur();
                            self._parseChat();
                        }
                    },
                    usernames[i],
                    Caches.getPlayerDetailsByUsernameCache()
                );
            }
        } else if (this.recipientUsernames.length > 0) {
            const usernames = this.recipientUsernames;
            let numUsernameResponses = 0;
            const numExpectedUsernameResponses = this.recipientUsernames.length;
            const playerIdsTalkingToThemselves = [];
            const playerIdMap = {};
            for (let i = 0; i < usernames.length; ++i) {
                playerIdMap[usernames[i]] = null;
            }

            const self = this;
            const correctlyCasedUsernames = [];
            for (let i = 0; i < usernames.length; ++i) {
                Backend.getInstance().getPlayerDetailsByUsername(
                    function(result) {
                        if (typeof(result) == "object") {
                            if (!Users.isAnyUser(result.getPlayerId())) {
                                playerIdMap[result.getUsername()] = result.getPlayerId();
                                correctlyCasedUsernames.push(result.getUsername());
                            } else {
                                playerIdsTalkingToThemselves.push(result.getPlayerId());
                            }
                        } else {
                            self.addSystemMessage([], "Could not find user " + result);
                        }
                    }, 
                    function(result) {
                    }, 
                    function(result) {
                        // Count that we got a response.
                        ++numUsernameResponses;
                        // If we have them all, collect any player ids found and send chat message.
                        if (numUsernameResponses == numExpectedUsernameResponses) {
                            // Since the usernames typed in might be wrongly cased, we use the "normalized" usernames that get back from the backend.
                            for (let j = 0; j < correctlyCasedUsernames.length; ++j) {
                                if (playerIdMap[correctlyCasedUsernames[j]]) {
                                    if (self.recipientPlayerIds.indexOf(playerIdMap[correctlyCasedUsernames[j]]) == -1) {
                                        self.recipientPlayerIds.push(playerIdMap[correctlyCasedUsernames[j]]);
                                    }
                                }
                            }
                            
                            // Mock the players whispering to themselves.
                            if (playerIdsTalkingToThemselves.length > 0) {
                                self.addSystemMessage(playerIdsTalkingToThemselves, "Why are you talking to [yourself,|yourselves,] @  ?");
                            }
                             
                            // Only send the message if any non-local players are left.
                            if (self.recipientPlayerIds.length > 0) {
                                self._sendChat(message);
                            } else {
                                self.chatInput.val("");
                                self.blur();
                                self._parseChat();
                            }
                        }
                    }, 
                    usernames[i],
                    Caches.getPlayerDetailsByUsernameCache()
                );
            }            
        } else {
            this._sendChat(message);
        }

    },

    _sendChat: function(message) {
        if (message !== "") {
            this.chat.addClass("send");
            this._updateInputBackground(true);
            this.blur();
            this.chatInput.prop("disabled", true);
            if (this.globalMessage) {
                this._notifyEventListeners(TankTrouble.ChatBox.EVENTS.GLOBAL_CHAT, message);
            } else if (this.recipientPlayerIds.length > 0) {
                this._notifyEventListeners(TankTrouble.ChatBox.EVENTS.USER_CHAT, {recipientPlayerIds: this.recipientPlayerIds, message: message});
            } else {
                this._notifyEventListeners(TankTrouble.ChatBox.EVENTS.CHAT, message);
            }
        } else {
            this.blur();
        }
    },

    _parseChat: function() {
        // Clear ignoree usernames.
        this.ignoreeUsernames = [];
        // Clear recipient player ids and usernames.
        this.recipientPlayerIds = [];
        this.recipientUsernames = [];
        this.globalMessage = false;

        this.chat.removeClass("global user");

        const message = this.chatInput.val().trim();
        // First check if global message.
        if (message.charAt(0) === '#') {
            this.globalMessage = true;

            this.chat.addClass("global");

            return message.substr(1);
        } else if (message.substr(0, 2) === "/r" && this.lastPrivateSenderPlayerIds) {
            // Reply to last private message.
            this.recipientPlayerIds = this.lastPrivateSenderPlayerIds;

            this.chat.addClass("user");

            return message.substr(2);
        } else if ((message.substr(0, 2) === "/i" || message.substr(0, 2) === "/u") && message.length > 2) {
            // Add or remove players to ignore list.
            this.addingToIgnoreList = (message.substr(0, 2) === "/i");
            const tokens = message.substr(2).split(' ');
            for (let i = 0; i < tokens.length; ++i) {
                const ignoree = tokens[i];
                if (ignoree !== "" && $.inArray(ignoree, this.ignoreeUsernames) == -1) {
                    this.ignoreeUsernames.push(ignoree);
                }
            }

            return "";
        } else {
            // Try to parse recipient tokens.
            const tokens = message.split(' ');
        
            let i = 0;
            for (; i < tokens.length; ++i) {
                const firstChar = tokens[i].charAt(0);
                if (firstChar === "@") {
                    const recipient = tokens[i].substr(1);
                    if (recipient !== "" && $.inArray(recipient, this.recipientUsernames) == -1) {
                        this.recipientUsernames.push(recipient);
                    }
                } else if (firstChar !== "") {
                    break;
                }
            }
            if (this.recipientPlayerIds.length > 0 || this.recipientUsernames.length > 0) {
                this.chat.addClass("user");
            }
        
            return tokens.slice(i).join(" ");
        }
    },
    
    _lookUpUsernamesAndAddChatMessage: function(from, to, addRecipients, textColor, strokeColor, message, chatMessageId) {
        // Determine which player ids to look up usernames for.
        let playerIds = from;
        if (addRecipients) {
            playerIds = playerIds.concat(to);
        }
        
        let numDetailsResponses = 0;
        const numExpectedDetailsResponses = playerIds.length;

        const usernameMap = {};
        for (let i = 0; i < playerIds.length; ++i) {
            usernameMap[playerIds[i]] = "<ERROR>";
        }
        
        const self = this;
        for (let i = 0; i < playerIds.length; ++i) {
            Backend.getInstance().getPlayerDetails(
                function(result) {
                    if (typeof(result) == "object") {
                        const username = Utils.maskUnapprovedUsername(result);
                        usernameMap[result.getPlayerId()] = username;
                    }
                }, 
                function(result) {
            
                }, 
                function(result) {
                    // Count that we got a response.
                    ++numDetailsResponses;
                    // If we have them all, add the message.
                    if (numDetailsResponses == numExpectedDetailsResponses) {
                        self._addChatMessage(from, to, usernameMap, addRecipients, textColor, strokeColor, message, chatMessageId);        
                    }
            
                }, 
                playerIds[i], 
                Caches.getPlayerDetailsCache()
            );
        }
    },
    
    _addSystemMessage: function(involvedPlayerIds, involvedUsernameMap, message) {
        this.messages.push(
            {type: "system", 
            involvedPlayerIds: involvedPlayerIds,
            involvedUsernameMap: involvedUsernameMap, 
            message: message}
        );

        if (this.messages.length > UIConstants.CHAT_BOX_MAX_NUM_MESSAGES) {
            this.messages.shift();
        }

        if (this.chat.hasClass("open")) {
            this._renderSystemMessage(involvedPlayerIds, involvedUsernameMap, message, true, true);
            // Wait until inserted message is full height to remove messages.
            const self = this;
            setTimeout(function() {
                self._updateChat(false);
            }, 200);
        }

        this._notifyNewMessage();
        
    },
    
    _addChatMessage: function(from, to, usernameMap, addRecipients, textColor, strokeColor, message, chatMessageId) {
        // Ignore messages from ignored players.
        if (ArrayUtils.containsSome(from, this.ignoredPlayerIds)) {
            return;
        }

        this.messages.push(
            {type: "chat",
             from: from, 
             to: to, 
             usernameMap: usernameMap, 
             addRecipients: addRecipients, 
             textColor: textColor, 
             strokeColor: strokeColor,
             message: message,
             chatMessageId: chatMessageId,
             reported: false}
        );

        if (this.messages.length > UIConstants.CHAT_BOX_MAX_NUM_MESSAGES) {
            this.messages.shift();
        }
        
        if (this.chat.hasClass("open")) {
            this._renderChatMessage(from, to, usernameMap, addRecipients, textColor, strokeColor, message, chatMessageId, false, true, true);
            // Wait until inserted message is full height to remove messages.
            const self = this;
            setTimeout(function() {
                self._updateChat(false);
            }, 200);
        }

        this._notifyNewMessage();
    },
    
    _addChatLink: function(message, svg, playerId, username) {
        const self = this;
        // Use [class=X] selector rather than .X to make it work in IE11 and Edge, which do not support getElementsByClassName on svg elements.
        const chatUser = $("[class="+playerId + "-messageUsername]", svg.root());
        chatUser.click(function(event) {
            if (!self.chatInput.prop("disabled")) {
                self.addRecipient(playerId);
            }
        });
        // jQuery 2 cannot addClass to svg element.
        chatUser.css("cursor", "pointer");

        // This no longer works in Chrome. It's a bug in Chrome.
        // See: https://bugs.chromium.org/p/chromium/issues/detail?id=349835&q=tspan%20bbox&colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Component%20Status%20Owner%20Summary%20OS%20Modified
        chatUser.tooltipster({ content: "Whisper to " + username, position: "bottom"});
    },
    
    _renderSystemMessage: function(involvedPlayerIds, involvedUsernameMap, message, animateHeight, animateFadeIn) {
        const systemMessage = $("<div class='chatMessage'></div>");

        systemMessage.svg({settings: {width: 0, height: 0}});
        const systemSvg = systemMessage.svg("get");
        let wordX = 1;
        let wordY = 12;
        let svgWidth = 1;
        let svgHeight = wordY + 5;
        
        let involvedPlayerIdCounter = 0;

        const words = message.split(' ');

        for (let i = 0; i < words.length; ++i) {
            let wordWidth;
            
            if (involvedPlayerIds !== undefined && words[i] == "@") {
                // If the word is the involved users marker, insert individual username markers and connecting words.
                const newWords = [];
                for (let j = 0; j < involvedPlayerIds.length; ++j) {
                    newWords.push("*");
                    if (j == involvedPlayerIds.length - 2) {
                        newWords.push("__");
                        newWords.push("and");
                    } else if (j < involvedPlayerIds.length - 2) {
                        newWords.push("_");
                        newWords.push(",");
                    }
                }

                // Trickery to make splice eat an array as third argument.
                Array.prototype.splice.apply(words, [i + 1, 0].concat(newWords));
                
                involvedPlayerIdCounter = 0;
                
                continue;
            } else if (involvedPlayerIds !== undefined && words[i] == "*") {
                const playerId = involvedPlayerIds[involvedPlayerIdCounter];
                // If the word is the individual username marker, insert username and do not append a space.
                wordWidth = Utils.measureSVGText(involvedUsernameMap[playerId], {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12});

                if (wordX + wordWidth > this.chatBody.width()) {
                    wordX = 1;
                    wordY += 14;
                    svgHeight = wordY + 5;
                }
                
                systemSvg.text(wordX, wordY, involvedUsernameMap[playerId], {class: playerId+'-messageUsernameStroke', fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: 'none', stroke: 'white', strokeLineJoin: 'round', strokeWidth: 3});
                systemSvg.text(wordX, wordY, involvedUsernameMap[playerId], {class: playerId+'-messageUsername', fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: 'black'});
                
                ++involvedPlayerIdCounter;
            } else if (involvedPlayerIds !== undefined && words[i].charAt(0) == '[') {
                // If the word is the plurality marker, select the correct word based on the number of involved users and append a space.
                const pluralityVariations = words[i].split('|');
                let word = "";
                if (involvedPlayerIds.length == 1) {
                    word = pluralityVariations[0].substring(1);
                } else {
                    word = pluralityVariations[1].substring(0, pluralityVariations[1].length - 1);
                }
                    
                wordWidth = Utils.measureSVGText(word, {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12});

                if (wordX + wordWidth > this.chatBody.width()) {
                    wordX = 1;
                    wordY += 14;
                    svgHeight = wordY + 5;
                }
                
                // Append a space.
                wordWidth += 4;

                systemSvg.text(wordX, wordY, word, {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: 'none', stroke: 'white', strokeLineJoin: 'round', strokeWidth: 3});
                systemSvg.text(wordX, wordY, word, {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: 'gray'});
            } else if (words[i] == "_") {
                // If the word is the small space marker, insert small space.
                wordWidth = 2;
            } else if (words[i] == "__") {
                // If the word is the space marker, insert space.
                wordWidth = 4;
            } else if (words[i] == "§") {
                // If the word is the newline marker, go to the next line and continue the loop.
                wordX = 1;
                wordY += 14;
                svgHeight = wordY + 5;
                continue;
            } else {
                // If the word is just a regular word.
                wordWidth = Utils.measureSVGText(words[i], {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12});

                if (wordX + wordWidth > this.chatBody.width()) {
                    wordX = 1;
                    wordY += 14;
                    svgHeight = wordY + 5;
                }
                
                // Append a space.
                wordWidth += 4;

                systemSvg.text(wordX, wordY, words[i], {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: 'none', stroke: 'white', strokeLineJoin: 'round', strokeWidth: 3});
                systemSvg.text(wordX, wordY, words[i], {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: 'gray'});
            }

            wordX += wordWidth;
        
            svgWidth = Math.max(wordX, svgWidth);
        }

        systemSvg.configure({width: svgWidth, height: svgHeight});

        if (involvedPlayerIds !== undefined) {
            for (let i = 0; i < involvedPlayerIds.length; ++i) {
                const involvedPlayerId = involvedPlayerIds[i];
                if (!Users.isAnyUser(involvedPlayerId)) {
                    this._addChatLink(systemMessage, systemSvg, involvedPlayerId, involvedUsernameMap[involvedPlayerId]);
                }
            }
        }

        this.chatBody.prepend(systemMessage);
        
        systemMessage.css({display: "none", opacity: 0, position: "relative", zIndex: this.nextZIndex++});
        if (animateHeight) {
            systemMessage.show(200);
        } else {
            systemMessage.show();
        }
        if (animateFadeIn) {
            systemMessage.animate({opacity: 1}, 200);
        } else {
            systemMessage.css({opacity: 1});
        }


        if (involvedPlayerIds !== undefined) {
            this._updatePlayerDetails(involvedPlayerIds);
        }
    },
    
    _renderChatMessage: function(from, to, usernameMap, addRecipients, textColor, strokeColor, message, chatMessageId, reported, animateHeight, animateFadeIn) {
        const chatMessage = $("<div class='chatMessage message-"+chatMessageId+"'></div>");

        chatMessage.svg({settings: {width: 0, height: 0}});
        const chatSvg = chatMessage.svg("get");
        let wordX = 1;
        let wordY = 12;
        let svgWidth = 1;
        let svgHeight = wordY + 5;

        for (let i = 0; i < from.length; ++i) {
            const fromUser = from[i];
            let word = usernameMap[fromUser];
            if (i < from.length - 1) {
                word += ",";
            } else {
                word += (addRecipients ? " @" : ":");
            }

            // Measure the username and a comma, colon or at.
            let wordWidth = Utils.measureSVGText(word, {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12});

            if (wordX + wordWidth > this.chatBody.width()) {
                wordX = 1;
                wordY += 14;
                svgHeight = wordY + 5;
            }

            chatSvg.text(wordX, wordY, word, {class: fromUser+'-messageUsernameStroke', fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: 'none', stroke: 'white', strokeLineJoin: 'round', strokeWidth: 3});
            chatSvg.text(wordX, wordY, word, {class: fromUser+'-messageUsername', fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: 'black'});

            // Append a space.
            wordX += wordWidth + 4;
            
            svgWidth = Math.max(wordX, svgWidth);
        }
                
        if (addRecipients) {
            for (let i = 0; i < to.length; ++i) {
                let word = usernameMap[to[i]];
                if (i < to.length - 1) {
                    word += ",";
                } else {
                    word += ":";
                }

                // Measure the username and a comma or colon.
                const wordWidth = Utils.measureSVGText(word, {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12});

                if (wordX + wordWidth > this.chatBody.width()) {
                    wordX = 1;
                    wordY += 14;
                    svgHeight = wordY + 5;
                }

                chatSvg.text(wordX, wordY, word, {class: to[i]+'-messageUsernameStroke', fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: 'none', stroke: 'white', strokeLineJoin: 'round', strokeWidth: 3});
                chatSvg.text(wordX, wordY, word, {class: to[i]+'-messageUsername', fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: 'black'});

                // Append a space.
                wordX += wordWidth + 4;

                svgWidth = Math.max(wordX, svgWidth);
            }
        }
        
        const words = message.split(' ');
        for (let i = 0; i < words.length; ++i) {
            let wordWidth = Utils.measureSVGText(words[i], {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12});
            
            // First check if word is too long to fit on one line.
            if (wordWidth > this.chatBody.width()) {
                // Split word. Always peel off at least one character (the +1).
                const fract = Math.floor((this.chatBody.width() - wordX) / wordWidth * words[i].length + 1);
                words.splice(i+1, 0, words[i].substr(fract));
                words[i] = words[i].substr(0, fract);
                
                // Update wordWidth.
                wordWidth = Utils.measureSVGText(words[i], {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12});
            }
            
            if (wordX + wordWidth > this.chatBody.width()) {
                wordX = 1;
                wordY += 14;
                svgHeight = wordY + 5;
            }

            chatSvg.text(wordX, wordY, words[i], {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: 'none', stroke: strokeColor, strokeLineJoin: 'round', strokeWidth: 3});
            chatSvg.text(wordX, wordY, words[i], {fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: textColor});

            // Append a space.
            wordX += wordWidth + 4;
            
            svgWidth = Math.max(wordX, svgWidth);
        }
        
        chatSvg.configure({width: svgWidth, height: svgHeight});

        this.chatBody.prepend(chatMessage);
        
        chatMessage.css({display: "none", opacity: 0, position: "relative", zIndex: this.nextZIndex++});
        if (animateHeight) {
            chatMessage.show(200);
        } else {
            chatMessage.show();
        }
        if (animateFadeIn) {
            chatMessage.animate({opacity: 1}, 200);
        } else {
            chatMessage.css({opacity: 1});
        }

        this._updatePlayerDetails(from);
        if (addRecipients) {
            this._updatePlayerDetails(to);
        }        

        let foundForeignUser = false;
        for (let i = 0; i < from.length; ++i) {
            const fromUser = from[i];
            if (!Users.isAnyUser(fromUser)) {
                foundForeignUser = true;
                
                this._addChatLink(chatMessage, chatSvg, fromUser, usernameMap[fromUser]);
            }
        }
        
        if (foundForeignUser) {

            const chatMessageWhistle = $("<img class='whistle' src='" + g_url("assets/images/chat/report.png") + "' srcset='" + g_url("assets/images/chat/report@2x.png") + " 2x' title=''/>");

            chatMessageWhistle.css('left', wordX+'px');
            chatMessageWhistle.hide();
            chatMessageWhistle.tooltipster({position: 'right', offsetX: 5});

            chatMessage.append(chatMessageWhistle);
            
            this._updateWhistle(chatMessageId, reported);
        }
    },
    
    _refreshChat: function(animate) {
        // Do an each on the children and fade them out.
        this.chatBody.find("div.chatMessage").each(function(index) {
            if (animate) {
                $(this).stop(true).fadeOut(200, function() {
                    $(this).remove();
                });
            } else {
                $(this).remove();
            }
        });
        
        // Render all items again.
        if (animate) {
            const self = this;
            setTimeout(function() {
                self._renderAllMessages(true);
                self._updateChat(false);
            }, 200);
        } else {
            this._renderAllMessages(false);
            this._updateChat(true);
        }
    },
    
    _renderAllMessages: function(animateFadeIn) {
        for (let i = 0; i < this.messages.length; ++i) {
            const message = this.messages[i];
            if (message.type == "chat") {
                this._renderChatMessage(message.from, message.to, message.usernameMap, message.addRecipients,
                    message.textColor, message.strokeColor, message.message, message.chatMessageId, message.reported, false, animateFadeIn);
            } else if (message.type == "system") {
                this._renderSystemMessage(message.involvedPlayerIds, message.involvedUsernameMap, message.message, false, animateFadeIn);
            }
        }

        this._updateChat(false);
    },
    
    _clearChat: function() {
        this.messages = [];

        // Do an each on the children and fade them out.
        this.chatBody.find("div.chatMessage").each(function(index) {
            $(this).stop(true).fadeOut(200, function() {
                $(this).remove();
            });
        });
    },
    
    _updateChat: function(instantlyRemoveOldMessages) {
        // Do an each on the children and if their position is larger than the height of the body, fade them out.
        const bodyHeight = this.chatBody.height();
        this.chatBody.find("div.chatMessage").each(function(index) {
            if ($(this).position().top + $(this).height() > bodyHeight) {
                if (instantlyRemoveOldMessages) {
                    $(this).remove();
                } else {
                    $(this).stop(true).fadeOut(200, function() {
                        $(this).remove();
                    });
                }
            }
        });
        
    },
    
    _notifyNewMessage: function() {
        if (FocusManager.isFocused()) {
            // Shake status icon if closed.
            if (!this.chat.hasClass("open")) {
                this.chatStatus.show("scale", 1)
                    .animate({height: "+=10px", width: "+=10px", top: "-=5px", left: "-=5px"}, 125)
                    .animate({height: "-=10px", width: "-=10px", top: "+=5px", left: "+=5px"}, 125)
                    .animate({height: "+=10px", width: "+=10px", top: "-=5px", left: "-=5px"}, 125)
                    .animate({height: "-=10px", width: "-=10px", top: "+=5px", left: "+=5px"}, 125);
                this.chatStatusNew.show("scale", 50)
                    .animate({height: "+=10px", width: "+=10px", top: "-=5px", left: "-=5px"}, 125)
                    .animate({height: "-=10px", width: "-=10px", top: "+=5px", left: "+=5px"}, 125)
                    .animate({height: "+=10px", width: "+=10px", top: "-=5px", left: "-=5px"}, 125)
                    .animate({height: "-=10px", width: "-=10px", top: "+=5px", left: "+=5px"}, 125);
            }
        } else {
            // Play audio cue.
            AudioManager.playSound(this.chatAudio);

            // Show status icon if closed.
            if (!this.chat.hasClass("open")) {
                this.chatStatusNew.show("scale", 50);
            }
        }
    },
    
    _updatePlayerDetails: function(playerIds) {
        for (let i = 0; i < playerIds.length; ++i) {
            Backend.getInstance().getPlayerDetails(
                function(result) {
                    if (typeof(result) == "object") {
                        let baseColour = result.getBaseColour().numericValue;
                        // Reformat strings to be edible for canvas operations.
                        baseColour = baseColour.substr(2);
                        baseColour = "#" + new Array(6 - baseColour.length + 1).join("0") + baseColour;

                        $("."+result.getPlayerId()+"-messageUsername").attr("fill", baseColour);

                        // Check if colour is so bright that we want a dark stroke.
                        const baseRed = parseInt(baseColour.substr(1, 2), 16);
                        const baseGreen = parseInt(baseColour.substr(3, 2), 16);
                        const baseBlue = parseInt(baseColour.substr(5, 2), 16);

                        const brightness = 0.299 * baseRed + 0.587 * baseGreen + 0.114 * baseBlue;
                        //0.2126 * Math.pow(baseRed/255.0, 2.2) + 0.7152 * Math.pow(baseGreen/255.0, 2.2) + 0.0722 * Math.pow(baseBlue/255.0, 2.2);
            
                        let strokeColour = "#ffffff";

                        if (brightness >= 145.0) {
                            strokeColour = "#333333";
                        }

                        $("."+result.getPlayerId()+"-messageUsernameStroke").attr("stroke", strokeColour);                        
                    }
                }, 
                function(result) {
                
                }, 
                function(result) {
                
                }, 
                playerIds[i], 
                Caches.getPlayerDetailsCache()
            );
        }
    },

    _updateMessageReported: function(chatMessageId, reported) {
        for (let i = 0; i < this.messages.length; ++i) {
            const message = this.messages[i];
            if (message.type == "chat" && message.chatMessageId == chatMessageId) {
                message.reported = reported;
                break;
            }
        }
    },

    _updateWhistle: function(chatMessageId, reported) {
        const chatMessage = $(".chatMessage.message-"+chatMessageId);
        
        if (chatMessage.length == 0) {
            return;
        }

        const whistle = chatMessage.find(".whistle");

        // Populate pretty usernames string.
        let prettyUsernames = "";
        for (let i = 0; i < this.messages.length; ++i) {
            const message = this.messages[i];
            if (message.type == "chat" && message.chatMessageId == chatMessageId) {
                for (let j = 0; j < message.from.length; ++j) {
                    const fromUser = message.from[j];
                    if (!Users.isAnyUser(fromUser)) {
                        prettyUsernames += message.usernameMap[fromUser];
                        if (j == message.from.length - 2) {
                            prettyUsernames += " and ";
                        } else if (j < message.from.length - 2) {
                            prettyUsernames += ", ";
                        }
                    }
                }
                break;
            }
        }
        
        const self = this;
        
        if (reported) {
            whistle.on("click", function(event) {
                if ($(this).hasClass("noclick")) {
                    $(this).removeClass("noclick");
                } else {
                    self._notifyEventListeners(TankTrouble.ChatBox.EVENTS.UNDO_CHAT_REPORT, chatMessageId);

                    whistle.off("click");
                }                    
            });

            chatMessage.off("mouseenter mouseleave");
            
            whistle.show();

            whistle.attr("src", g_url("assets/images/chat/reportSelected.png"));
            whistle.attr("srcset", g_url("assets/images/chat/reportSelected@2x.png") + " 2x");

            // Set the tooltip content to get it to update.
            whistle.tooltipster("content", "You have reported "+prettyUsernames);
            
        } else {
            whistle.on("click", function(event) {
                if ($(this).hasClass("noclick")) {
                    $(this).removeClass("noclick");
                } else {
                    self._notifyEventListeners(TankTrouble.ChatBox.EVENTS.REPORT_CHAT, chatMessageId);

                    whistle.off("click");
                }                    
            });
            
            chatMessage.on("mouseenter", function(event) {
                whistle.stop(true).fadeIn(200);
            });

            chatMessage.on("mouseleave", function(event) {
                whistle.stop(true).fadeOut(200);
            });
            
            whistle.attr("src", g_url("assets/images/chat/report.png"));
            whistle.attr("srcset", g_url("assets/images/chat/report@2x.png") + " 2x");

            // Set the tooltip content to get it to update.
            whistle.tooltipster("content", "Report "+prettyUsernames);
        }
    },

    _notifyEventListeners: function(evt, data) {
        for (let i = 0;i<this.eventListeners.length;i++) {
            this.eventListeners[i].cb(this.eventListeners[i].ctxt, evt, data);
        }
    },

    _clientEventHandler: function(self, evt, data) {
        switch(evt) {
            case TTClient.EVENTS.GLOBAL_CHAT_POSTED:
            {
                self._handleChatSendReceipt(data.getSendReceipt());
                self.addGlobalChatMessage(data.getFrom(), data.getMessage(), data.getChatMessageId());
                
                break;
            }    
            case TTClient.EVENTS.CHAT_POSTED:
            {
                self._handleChatSendReceipt(data.getSendReceipt());
                self.addChatMessage(data.getFrom(), data.getMessage(), data.getChatMessageId());
                
                break;
            }
            case TTClient.EVENTS.USER_CHAT_POSTED:
            {
                self._handleChatSendReceipt(data.getSendReceipt());
                self.addUserChatMessage(data.getFrom(), data.getTo(), data.getMessage(), data.getChatMessageId());

                // Store latest private message sender if it came from someone else.
                let fromLocal = false;
                for (let i = 0; i < data.getFrom().length; ++i) {
                    if (Users.isAnyUser(data.getFrom()[i])) {
                        fromLocal = true;
                    }
                }
                if (!fromLocal) {
                    self.lastPrivateSenderPlayerIds = data.getFrom();
                }
                
                break;
            }
            case TTClient.EVENTS.SYSTEM_CHAT_POSTED:
            {
                self._handleChatSendReceipt(data.getSendReceipt());
                self.addSystemMessage(data.getInvolvedPlayerIds(), data.getMessage());
            
                break;
            }
            case TTClient.EVENTS.PLAYERS_BANNED:
            {
                self.addSystemMessage(data, "@  [was|were] temporarily banned");

                break;
            }
            case TTClient.EVENTS.PLAYERS_UNBANNED:
            {
                self.addSystemMessage(data, "@  [was|were] unbanned");

                break;
            }
            case TTClient.EVENTS.CHAT_REPORTED:
            {
                // Update chat message with reported information.
                self._updateMessageReported(data, true);

                // Update whistle.
                self._updateWhistle(data, true);
                break;
            }
            case TTClient.EVENTS.CHAT_REPORT_UNDONE:
            {
                // Clear chat message from reported information.
                self._updateMessageReported(data, false);

                // Update whistle.
                self._updateWhistle(data, false);
                
                break;
            }
            case TTClient.EVENTS.PLAYERS_AUTHENTICATED:
            {
                self._updateStatusMessageAndAvailability("", []);

                break;
            }
        }
    },

    _handleChatSendReceipt: function(sendReceipt) {
        if (sendReceipt === "") {
            return;
        }

        this.chat.removeClass("send");
        this._updateInputBackground(true);

        switch(sendReceipt) {
            case Constants.CHAT_SEND_RECEIPT.SUCCESS:
            case Constants.CHAT_SEND_RECEIPT.FAIL:
            {
                this.chatInput.val("");
                this._parseChat();
                this._updateStatusMessageAndAvailability("",[]);

                break;
            }
            case Constants.CHAT_SEND_RECEIPT.RETRY:
            {
                this._updateStatusMessageAndAvailability("",[]);
                break;
            }
        }
    },

    _updateStatusMessageAndAvailability: function(systemMessageText, guestPlayerIds) {
        const playerIds = Users.getAllPlayerIds();
        if (playerIds.length == 0) {
            this.chatInput.attr("placeholder", "Join to transmit");
            this.chatInput.val("");
            this.chatInput.prop("disabled", true);
            this._parseChat();
            if (systemMessageText != "") {
                this.addSystemMessage([], systemMessageText);
            }
        } else {
            const authenticatedPlayerIds = Users.getAuthenticatedPlayerIds();
            if (authenticatedPlayerIds.length > 0) {
                const mpAuthenticatedPlayerIds = ClientManager.getClient().getAuthenticatedPlayerIds();
                // Only enable input if there are any authenticated players also authenticated on the mp server.
                if (mpAuthenticatedPlayerIds.length > 0 && ArrayUtils.containsSome(mpAuthenticatedPlayerIds, authenticatedPlayerIds)) {
                    this.chatInput.attr("placeholder", "Message");
                    this.chatInput.prop("disabled", this.chat.hasClass("send"));
                } else {
                    this.chatInput.attr("placeholder", "Please wait");
                    this.chatInput.val("");
                    this.chatInput.prop("disabled", true);
                }
            } else {
                this.chatInput.attr("placeholder", "Sign up to transmit");
                this.chatInput.val("");
                this.chatInput.prop("disabled", true);
                this._parseChat();
            }
            if (guestPlayerIds.length > 0) {
                this.addSystemMessage(guestPlayerIds, systemMessageText + "@  must sign up to chat");
            } else {
                if (systemMessageText != "") {
                    this.addSystemMessage([], systemMessageText);
                }
            }
        }
    },

    _updateInputBackground: function(animate) {
        if (animate) {
            const self = this;

            if (this.chat.hasClass('send')) {
                let backgroundColour = "#ffffff";
                let stripeColour = "#cccccc";

                if (this.chat.hasClass('global')) {
                    backgroundColour = "#68c5ff";
                    stripeColour = "#ffffff";
                } else if (this.chat.hasClass('user')) {
                    backgroundColour = "#00ff02";
                    stripeColour = "#ffffff";
                }
                this.chatForm.stop(true).delay(500).animate({stripeValue: 100}, {duration: 100, step: function(value) {
                    const b = (1 - value / 100) * 10;
                    self.chatForm.css("background", "repeating-linear-gradient(53deg, " + stripeColour + " 0, " + stripeColour + " " + (10-b) + "px, " + backgroundColour + " " + (10-b) + "px, " + backgroundColour + " " + (30+b) + "px, " + stripeColour + " " + (30+b) + "px, " + stripeColour + " 40px");
                }});
            } else {
                let backgroundColour = "#ffffff";
                let stripeColour = "#cccccc";
                let valueScale = 1;

                if (this.chat.hasClass('global')) {
                    backgroundColour = "#68c5ff";
                    stripeColour = "#ffffff";
                    valueScale = -1;
                } else if (this.chat.hasClass('user')) {
                    backgroundColour = "#00ff02";
                    stripeColour = "#ffffff";
                    valueScale = -1;
                }

                this.chatForm.stop(true).animate({stripeValue: 0}, {duration: 100, step: function(value) {
                    const b = (1 - value / 100) * 10 * valueScale;
                    self.chatForm.css("background", "repeating-linear-gradient(53deg, " + stripeColour + " 0, " + stripeColour + " " + (10-b) + "px, " + backgroundColour + " " + (10-b) + "px, " + backgroundColour + " " + (30+b) + "px, " + stripeColour + " " + (30+b) + "px, " + stripeColour + " 40px");
                }, complete: function() {
                    self.chatForm.removeAttr("style");
                }});
            }
        } else {
            if (this.chat.hasClass('send')) {
                this.chatForm.prop('stripeValue', 100);
            } else {
                this.chatForm.prop('stripeValue', 0);
            }
            this.chatForm.removeAttr("style");
        }
    },

    _removeLocalPlayersFromIgnored: function() {
        const removedLocalPlayerIds = [];

        this.ignoredPlayerIds = this.ignoredPlayerIds.filter(
            function(item) {
                const localPlayer = Users.getAllPlayerIds().indexOf(item) >= 0;
                if (localPlayer) {
                    removedLocalPlayerIds.push(item);
                }
                return !localPlayer;
            }
        );

        if (removedLocalPlayerIds.length > 0) {
            this.addSystemMessage(removedLocalPlayerIds, "You cannot ignore [yourself,|yourselves,] @ ");
        }
    },

    _clientStateHandler: function(self, oldState, newState, data, msg) {
        switch(newState) {
            case TTClient.STATES.UNCONNECTED:
            {
                self._clearChat();
                self.chatStatus.attr("src", g_url("assets/images/chat/chatDisabled.png"));
                self.chatStatus.attr("srcset", g_url("assets/images/chat/chatDisabled@2x.png") + " 2x");
                self.chatStatusNew.hide("scale", 50);

                self.chat.removeClass("send");
                self._updateInputBackground(false);

                self.chatInput.attr("placeholder", "Signal lost");
                self.chatInput.val("");
                self.chatInput.prop("disabled", true);
                self._parseChat();

                break;
            }
            case TTClient.STATES.HANDSHAKED:
            {
                if (oldState === TTClient.STATES.CONNECTED) {
                    self.chatStatus.attr("src", g_url("assets/images/chat/chat.png"));
                    self.chatStatus.attr("srcset", g_url("assets/images/chat/chat@2x.png") + " 2x");
                    const guestPlayerIds = Users.getGuestPlayerIds();
                    self._updateStatusMessageAndAvailability("Welcome to TankTrouble Comms § § ", guestPlayerIds);
                }

                break;
            }
        }
    },
    
    _authenticationEventHandler: function(self, evt, data) {
        switch(evt) {
            case Users.EVENTS.GUEST_ADDED:
            {
                self._removeLocalPlayersFromIgnored();
                self._updateStatusMessageAndAvailability("", [data]);
                break;
            }
            case Users.EVENTS.GUESTS_ADDED:
            {
                self._removeLocalPlayersFromIgnored();
                self._updateStatusMessageAndAvailability("", data);
                break;
            }
            default:
            {
                self._removeLocalPlayersFromIgnored();
                self._updateStatusMessageAndAvailability("", []);
                break;
            }
        }
    },
    
    _resizeEventHandler: function(self, evt, data) {
        switch(evt) {
            case ResizeManager.EVENTS.REFRESH:
            case ResizeManager.EVENTS.RESIZE:
            {
                self.chat.position({
                    my: "left top",
                    at: "left+"+Math.min(
                                    Math.max(
                                        self.chat.position().left, 
                                        $("#content").offset().left + 34
                                    ), 
                                    $("#content").offset().left + $("#content").width() - self.chatBody.width() - 30
                                )+" top+"+Math.min(self.chat.position().top, $(window).height() - 40),
                    of: $(window)
                });
                
                break;
            }
        }        
    }
};
