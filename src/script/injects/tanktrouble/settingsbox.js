const TankTrouble = TankTrouble || {};

TankTrouble.SettingsBox = {
    // jQuery objects.
    settings: null,
    settingsContent: null,
    settingsTabTop: null,
    settingsServerTitleDiv: null,
    settingsServerForm: null,
    settingsServerSelect: null,
    settingsServerOptions: [],
    settingsQualityTitleDiv: null,
    settingsQualityForm: null,
    settingsQualitySelect: null,
    settingsQualityOptions: [],

    settingsBackground: null,
    
    refreshServerStatsInterval: null,
    
    // State.
    showing: false,

    init: function() {
        // FIXME Define this custom select menu somewhere else.
        // Create a custom select menu, called 'iconselectmenu', which defines a custom render function.
        $.widget( "custom.iconselectmenu", $.ui.selectmenu, {
            _renderItem: function(ul, item) {
                const li = $("<li>", { 
                    text: item.label 
                });

                if (item.disabled) {
                    li.addClass("ui-state-disabled");
                }

                if (item.element.attr("data-imagesrc")) {
                    $("<img width='26' src='" + item.element.attr("data-imagesrc") + "' srcset='" + item.element.attr("data-imagesrcset") + "'/>").addClass("ui-icon").appendTo(li);
                }

                if (item.element.attr("data-description")) {
                    $("<div style='font-size: 0.7em;'>" + item.element.attr("data-description") + "</div>").appendTo(li);
                }

                return li.appendTo(ul);
            }
        });
        
        this.settings = $("<div class='box noselect' id='settings'></div>");
        this.settingsContent = $("<div class='content'></div>");
        this.settingsTabTop = $("<div class='tab topRight'></div>");
        this.settingsServerTitleDiv = $("<div class='spaced'>Server:</div>");
        this.settingsServerForm = $("<form class='spaced'></form>");
        this.settingsServerSelect = $("<select/>");

        const servers = ClientManager.getAvailableServers();
        const serverIds = Object.keys(servers);
        for (let i = 0; i < serverIds.length; ++i) {
            const serverData = servers[serverIds[i]];
            const option = $("<option disabled value='" + serverIds[i] + "' data-imagesrc='" + g_url("assets/images/game/pingTimeNoConnection.png") + "' data-imagesrcset='" + g_url("assets/images/game/pingTimeNoConnection@2x.png") + " 2x' data-description=' (N/A ms)'>" + serverData.name + "</option>");
            
            this.settingsServerOptions.push(option);
        }

        this.settingsQualityTitleDiv = $("<div class='spaced'>Quality:</div>");
        this.settingsQualityForm = $("<form class='spaced'></form>");
        this.settingsQualitySelect = $("<select/>");

        this.settingsQualityOptions.push($("<option selected value='auto' data-imagesrc='" + g_url("assets/images/game/pingTimeNoConnection.png") + "' data-imagesrcset='" + g_url("assets/images/game/pingTimeNoConnection@2x.png") + " 2x' data-description=' (N/A fps)'>Auto</option>"));
        this.settingsQualityOptions.push($("<option value='high'>High</option>"));
        this.settingsQualityOptions.push($("<option value='low'>Low</option>"));
        this.settingsQualityOptions.push($('<option value="minimum">Minimum</option>'));

        this.settingsBackground = $("<div class='boxbackground'></div>");

        for (let i = 0; i < this.settingsServerOptions.length; ++i) {
            this.settingsServerSelect.append(this.settingsServerOptions[i]);
        }

        this.settingsServerForm.append(this.settingsServerSelect);

        for (let i = 0; i < this.settingsQualityOptions.length; ++i) {
            this.settingsQualitySelect.append(this.settingsQualityOptions[i]);
        }

        this.settingsQualityForm.append(this.settingsQualitySelect);

        this.settingsContent.append(this.settingsTabTop);
    
        this.settingsContent.append(this.settingsServerTitleDiv);
        this.settingsContent.append(this.settingsServerForm);

        this.settingsContent.append(this.settingsQualityTitleDiv);
        this.settingsContent.append(this.settingsQualityForm);

        this.settings.append(this.settingsContent);
    
        $("body").append(this.settingsBackground);
        $("body").append(this.settings);
    
        this.settingsBackground.hide();
        this.settings.hide();
    
        const self = this;

        this.settingsBackground.click(function(event) {
            if (self.showing) {
                self.hide();
            }
        });
    
        // Place content according to UI constants.
        this.settingsServerSelect.css("width", UIConstants.SETTINGS_WIDTH - 10);
        this.settingsServerSelect.css("height", UIConstants.SETTINGS_SERVER_SELECT_HEIGHT);
        this.settingsQualitySelect.css("width", UIConstants.SETTINGS_WIDTH - 10);
        this.settingsQualitySelect.css("height", UIConstants.SETTINGS_QUALITY_SELECT_HEIGHT);

        // Set the selected server.
        if (Cookies.get('multiplayerserverid')) {
            this.settingsServerSelect.val(Cookies.get('multiplayerserverid'));
        }

        // Set the selected quality.
        if (Cookies.get('quality')) {
            this.settingsQualitySelect.val(Cookies.get('quality'));
        }
        
        // Use custom jQuery UI icon select menu.
        this.settingsServerSelect.iconselectmenu({
            change: function(event, ui) { self._changeServer(event, ui); }
        }).iconselectmenu("menuWidget").addClass("ui-menu-icons").css("max-height", UIConstants.SETTINGS_SERVER_MAX_OPTION_HEIGHT);

        // Use custom jQuery UI icon select menu.
        this.settingsQualitySelect.iconselectmenu({
            change: function(event, ui) { self._changeQuality(event, ui); }
        }).iconselectmenu("menuWidget").addClass("ui-menu-icons").css("max-height", UIConstants.SETTINGS_QUALITY_MAX_OPTION_HEIGHT);

        this.initialized = true;

        QualityManager.addEventListener(this._qualityEventHandler, this);

        // Set correct state on quality select.
        this._setQuality(QualityManager.getQuality());

        // Refresh the server list every minute.
        this.refreshServerStatsInterval = setInterval(function() { self._refreshServerStats(); }, UIConstants.REFRESH_SERVER_STATS_INTERVAL);

        // Refresh it with a slight delay to get more accurate timings.
        setTimeout(function() {self._refreshServerStats();}, UIConstants.INITIAL_SERVER_STATS_DELAY);
    },
    
    show: function(x, y, preferredRadius) {
        this.settings.show();
        this.settingsBackground.fadeIn(200);

        this.showing = true;

        this.settings.removeClass("left right top bottom");

        this.settings.position({my: "right top", at: "left+"+(x+35)+" top+"+(y+preferredRadius+30), of: $(document), collision: 'none'});  // +35 to account for position of tab, +30 to account for size of tab.
        this.settings.addClass("topRight");

        this.settings.css({scale: 0, opacity: 0, transformOrigin: '225px -35px'});
        this.settings.transition({scale: 1, queue: false}, 300, 'easeOutBack');
        this.settings.animate({opacity: 1}, {duration: 200, queue: false});

        GameManager.disableGameInput();

        // Reset input values.
    },
    
    hide: function() {
        const self = this;
        this.settings.transition({scale: 0, queue: false}, 200, 'easeInQuad', function() {
            self.settings.hide();
            self.settings.css({scale: 1});
        });
        this.settings.animate({opacity: 0}, {duration: 200, queue: false});
        this.settingsBackground.fadeOut(200);
        
        TankTrouble.SettingsButton.close();

        this.settingsServerSelect.iconselectmenu("widget").blur();
        this.settingsQualitySelect.iconselectmenu("widget").blur();

        this.showing = false;

        GameManager.enableGameInput();
    },

    setServer: function(serverId) {
        if (this.settingsServerSelect) {
            this.settingsServerSelect.val(serverId);
            this.settingsServerSelect.iconselectmenu("refresh");
        }
    },

    enableServer: function(serverId, latency) {
        if (this.settingsServerSelect) {
            const option = this.settingsServerSelect.find("option[value='" + serverId + "']");

            option.removeAttr("disabled");
            option.attr("data-description", " (" + latency + " ms)");
            if (latency < UIConstants.MAXIMUM_GOOD_LATENCY) {
                option.attr("data-imagesrc", "/assets/images/game/pingTimeGood.png");
                option.attr("data-imagesrcset", "/assets/images/game/pingTimeGood@2x.png 2x");
            } else if (latency < UIConstants.MAXIMUM_AVERAGE_LATENCY) {
                option.attr("data-imagesrc", "/assets/images/game/pingTimeAverage.png");
                option.attr("data-imagesrcset", "/assets/images/game/pingTimeAverage@2x.png 2x");
            } else {
                option.attr("data-imagesrc", "/assets/images/game/pingTimeBad.png");
                option.attr("data-imagesrcset", "/assets/images/game/pingTimeBad@2x.png 2x");
            }

            this.settingsServerSelect.iconselectmenu("refresh");
        }
    },
    
    disableServer: function(serverId) {
        if (this.settingsServerSelect) {
            const option = this.settingsServerSelect.find("option[value='"+serverId+"']");

            option.attr("disabled", "disabled");
            option.attr("data-description", " Offline");
            option.attr("data-imagesrc", "/assets/images/game/pingTimeNoConnection.png");
            option.attr("data-imagesrcset", "/assets/images/game/pingTimeNoConnection@2x.png 2x");

            this.settingsServerSelect.iconselectmenu("refresh");
        }
    },
    
    _changeServer: function(event, ui) {
        this.hide();
        ClientManager.selectMultiplayerServer(ui.item.value);
    },

    _refreshServerStats: function() {
        const self = this;
        ClientManager.getAvailableServerStats(function(success, serverId, latency, gameCount, playerCount, message) {
            if (success) {
                // Enable server.
                self.enableServer(serverId, latency);
            } else {
                // Disable server.
                self.disableServer(serverId);
            }
        });
        
    },

    _setQuality: function(quality) {
        this.settingsQualitySelect.val(quality);
        this.settingsQualitySelect.iconselectmenu("refresh");
    },

    _updateFps: function(fps) {
        const option = this.settingsQualitySelect.find("option[value='auto']");
        if (fps) {
            option.attr("data-description", " (" + Math.floor(fps) + " fps)");
            if (fps > UIConstants.MINIMUM_GOOD_FPS) {
                option.attr("data-imagesrc", "/assets/images/game/pingTimeGood.png");
                option.attr("data-imagesrcset", "/assets/images/game/pingTimeGood@2x.png 2x");
            } else if (fps > UIConstants.MINIMUM_AVERAGE_FPS) {
                option.attr("data-imagesrc", "/assets/images/game/pingTimeAverage.png");
                option.attr("data-imagesrcset", "/assets/images/game/pingTimeAverage@2x.png 2x");
            } else {
                option.attr("data-imagesrc", "/assets/images/game/pingTimeBad.png");
                option.attr("data-imagesrcset", "/assets/images/game/pingTimeBad@2x.png 2x");
            }
        } else {
            option.attr("data-description", " (N/A fps)");
            option.attr("data-imagesrc", "/assets/images/game/pingTimeNoConnection.png");
            option.attr("data-imagesrcset", "/assets/images/game/pingTimeNoConnection@2x.png 2x");
        }

        this.settingsQualitySelect.iconselectmenu("refresh");
    },

    _changeQuality: function(event, ui) {
        this.hide();
        QualityManager.setQuality(ui.item.value);
    },

    _qualityEventHandler: function(self, evt, data) {
        switch(evt) {
            case QualityManager.EVENTS.QUALITY_SET:
            {
                self._setQuality(data);

                break;
            }
            case QualityManager.EVENTS.FPS_UPDATED:
            {
                self._updateFps(data);

                break;
            }
        }
    }
};
