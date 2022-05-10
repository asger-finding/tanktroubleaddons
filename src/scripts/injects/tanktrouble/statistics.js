var TankTrouble = TankTrouble || {}; // eslint-disable-line no-var

TankTrouble.Statistics = {
    init: function() {
        this.wrapper = $("<div id='statisticsSnippet' class='snippet teaser standard'></div>");
        this.content = $("<div class='content'></div>");
        this.header = $("<div class='header'>Who has deployed?</div>");
        this.onlinePlayerCount = $("<div id='onlinePlayerCount'></div>");
        this.onlineGameCount = $("<div id='onlineGameCount'></div>");
        this.statsToggle = $("<div class='managedNavigation'></div>");

        this.content.append([this.header, this.onlinePlayerCount, this.onlineGameCount, this.statsToggle]);
        this.wrapper.append(this.content);

        $("#secondaryContent").append(this.wrapper);

        this.type = "server";
        this._switchStats();
        this._updateStatistics();

        const self = this;

        this.statsToggle.on("mouseup", function(event) {
            self._switchStats();
        });
        setInterval(function() {
            self._updateStatistics();
        }, 30000);
    },
    
    _updateStatistics: function() {
        const self = this;

        if (this.type === "global") {
            Backend.getInstance().getStatistics(
                function(result) {
                    if (typeof result == "object") {
                        //$("#visits").text(response.result.data.visits);
                        //$("#visitsToday").text(response.result.data.visitsToday);
                        //self._updateNumber($("#tankOwners"), result.tankOwners, "player");
                        self._updateNumber(self.onlinePlayerCount, result.onlineStatistics.playerCount);
                        self._updateNumber(self.onlineGameCount, result.onlineStatistics.gameCount, "game");
                    }
                },
                function(result) {
                    // Error
                },
                function(result) {
                    // Complete
                }
            );
        } else if (this.type === "server") {
            const serverId = ClientManager.multiplayerServerId;

            ClientManager._getSelectedServerStats(serverId, function(success, serverId, latency, gameCount, playerCount, message) {
                self._updateNumber(self.onlinePlayerCount, playerCount || 0);
                self._updateNumber(self.onlineGameCount, gameCount || 0, "game");
            });
        }
    },
    
    _updateNumber: function(element, newValue, suffix) {
        const textContent = element.text();
        const number = parseInt(textContent, 10);
        if (!isNaN(number)) {
            if (number != newValue) {
                if (newValue > number) {
                    $({value: number}).animate({value: newValue}, {
                          duration: 2000,
                          easing:'easeOutQuad',
                          step: function() {
                              // Update the element's text with ceiled value.
                              const ceiledValue = Math.ceil(this.value);
                              let finalSuffix = "";
                              if (suffix) {
                                  finalSuffix = suffix + (ceiledValue != 1 ? "s":"");
                              }
                              element.text(ceiledValue + " " + finalSuffix);
                          }
                    });
                    element.addClass('positive');
                    element.switchClass('positive', '', 2000, 'easeOutQuad');
                } else {
                    $({value: number}).animate({value: newValue}, {
                          duration: 2000,
                          easing:'easeOutQuad',
                          step: function() {
                              // Update the element's text with floored value.
                              const flooredValue = Math.floor(this.value);
                              let finalSuffix = "";
                              if (suffix) {
                                  finalSuffix = suffix + (flooredValue != 1 ? "s":"");
                              }
                              element.text(flooredValue + " " + finalSuffix);
                          }
                    });
                    element.addClass('negative');
                    element.switchClass('negative', '', 2000, 'easeOutQuad');
                }
            }
        } else {
            let finalSuffix = "";
            if (suffix) {
                finalSuffix = suffix + (newValue != 1 ? "s":"");
            }
            element.text(newValue + " " + finalSuffix);
        }
    },

    _switchStats: function() {
        if (this.type === "global") {
            this.type = "server";
            this.statsToggle.text("Server");
        } else if (this.type === "server") {
            this.type = "global";
            this.statsToggle.text("Global");
        }
        this._updateStatistics();
    }
};
