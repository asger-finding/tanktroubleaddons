const TankTrouble = TankTrouble || {};

TankTrouble.AdminPlayerLookupOverlay = {

    // jQuery objects.
    wrapper: null,
    navigation: null,
    details: null,
    adminLogs: null,

	// State.
    initialized: false,
    adminId: null,
    playerId: null,
    enabled: null,
    logs: null,
    logsLoaded: null,

    _initialize: function() {
        if (this.initialized) {
            return;
        }

        this.wrapper = $("<div class='admin playerLookup'/>");
        this.navigation = AdminOverlayNavigation.create();
        this.details = $("<div/>");
        this.adminLogs = $('<div class="section"/>');

        this.wrapper.append(
            this.navigation,
            this.details,
            this.adminLogs
        );

        this.initialized = true;
    },

    /**
     * Expects params.adminId and params.playerId
     * @param Object params
     */
    show: function(params) {
        this._initialize();

        this.adminId = params.adminId;
        this.playerId = params.playerId;
        this.enabled = [];

        AdminOverlayNavigation.update(this.adminId, this.navigation);

        const self = this;

        this.wrapper.parent().on('scroll.tankIcon', function(){
            self._positionTankIcon();
        });

        this._update();
    },

    hide: function() {
        this._initialize();

        this.wrapper.parent().off('scroll.tankIcon');
    },

    getContents: function() {
        this._initialize();

        return this.wrapper;
    },

    shouldHide: function() {
        return true;
    },

    canBeCancelled: function() {
        return true;
    },

    setPlayerNameApproved: function(playerName, approved) {
        this._disable();

        const self = this;
        Backend.getInstance().setPlayerNamesApproved(
            function(result) {
                if (result === true) {
                    self._update();
                    // Signal update to all to enable/disable username mask.
                    ClientManager.broadcastUpdateUserByAdmin(self.adminId, self.playerId, false, true, false);
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            [this.playerId],
            [playerName],
            approved,
            Caches.getPlayerDetailsCache()
        );
    },

    setPlayerBanned: function(banned) {
        this._disable();

        const self = this;
        Backend.getInstance().setPlayerBanned(
            function(result) {
                if (result === true) {
                    self._update();
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId,
            banned,
            Caches.getPlayerDetailsCache()
        );
    },

    recommendPlayerPromotion: function() {
        this._disable();

        const self = this;
        Backend.getInstance().recommendPlayerPromotion(
            function(result) {
                if (result === true) {
                    self._update();
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId,
            Caches.getPlayerDetailsCache()
        );
    },

    setPlayerAdminLevel: function(adminLevel) {
        this._disable();

        const self = this;
        Backend.getInstance().setPlayerAdminLevel(
            function(result) {
                if (result === true) {
                    self._update();
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId,
            adminLevel,
            Caches.getPlayerDetailsCache()
        );
    },

    enableRetire: function() {
        this.details.find('button.retire.enable').prop('disabled', true);
        this.details.find('button.retire.cancel').show();
        this.details.find('button.retire.confirm').show();
    },

    cancelRetire: function() {
        this.details.find('button.retire.enable').prop('disabled', false);
        this.details.find('button.retire.cancel').hide();
        this.details.find('button.retire.confirm').hide();
    },

    confirmRetire: function() {
        this._disable();

        const self = this;

        Backend.getInstance().retireAdmin(
            function(result) {
                if (result === true) {
                    if (self.adminId == self.playerId) {
                        OverlayManager.replaceOverlay(
                            TankTrouble.MessageOverlay,
                            {
                                headline: "We are sad to see you go",
                                message: "<p>The laboratory is immensely grateful for all your services.</p><p>You have earned a permanent place in our cold scientist hearts, and we wish you all the best of luck in your future endeavours.</p><p>May they be destructive!</p><p>Sincerely,<br><span class='signature'>Purup & bbc</span></p>"
                            }
                        );
                    } else {
                        self._update();
                    }
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId,
            Caches.getPlayerDetailsCache()
        );
    },

    enableResetPassword: function() {
        this.details.find('button.resetPassword.enable').prop('disabled', true);
        this.details.find('button.resetPassword.cancel').show();
        this.details.find('button.resetPassword.confirm').show();
    },

    cancelResetPassword: function() {
        this.details.find('button.resetPassword.enable').prop('disabled', false);
        this.details.find('button.resetPassword.cancel').hide();
        this.details.find('button.resetPassword.confirm').hide();
    },

    confirmResetPassword: function() {
        this._disable();

        const self = this;
        Backend.getInstance().resetAccountPassword(
            function(result) {
                if (result === true) {
                    self._update();
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId
        );
    },

    resendVerificationEmail: function() {
        this._disable();

        const self = this;
        Backend.getInstance().resendVerificationEmailAsAdmin(
            function(result) {
                if (result === true) {
                    self._update();
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId
        );
    },

    enableEditEmail: function() {
        this.details.find('button.editEmail.enable').prop('disabled', true);
        this.details.find('input.editEmail').alphanum({allow: '-_.@', allowSpace: false, allowOtherCharSets: false, maxLength: 128}).show();
        this.details.find('button.editEmail.cancel').show();
        this.details.find('button.editEmail.confirm').show();
    },

    cancelEditEmail: function() {
        this.details.find('button.editEmail.enable').prop('disabled', false);
        this.details.find('input.editEmail').val('').hide();
        this.details.find('button.editEmail.cancel').hide();
        this.details.find('button.editEmail.confirm').hide();
    },

    confirmEditEmail: function() {
        this._disable();

        const self = this;
        Backend.getInstance().setEmailAsAdmin(
            function(result){
                if (result === true) {
                    self._update();
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId,
            this.details.find('input.editEmail').val(),
            Caches.getEmailCache()
        );
    },

    enableDeleteEmail: function() {
        this.details.find('button.editEmail.enable').prop('disabled', true);
        this.details.find('button.deleteEmail.enable').prop('disabled', true);
        this.details.find('button.deleteEmail.cancel').show();
        this.details.find('button.deleteEmail.confirm').show();
    },

    cancelDeleteEmail: function() {
        this.details.find('button.editEmail.enable').prop('disabled', false);
        this.details.find('button.deleteEmail.enable').prop('disabled', false);
        this.details.find('button.deleteEmail.cancel').hide();
        this.details.find('button.deleteEmail.confirm').hide();
    },

    confirmDeleteEmail: function() {
        this._disable();

        const self = this;
        Backend.getInstance().setEmailAsAdmin(
            function(result){
                if (result === true) {
                    self._update();
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId,
            null,
            Caches.getEmailCache()
        );
    },

    deleteAccount: function() {
        this.details.find("button.deleteAccount.enable").prop('disabled', true);
        this.details.find("button.deleteAccount.cancel").show();
        this.details.find("button.deleteAccount.confirm").show();
    },

    deleteAccountCancel: function() {
        this.details.find("button.deleteAccount.enable").prop('disabled', false);
        this.details.find("button.deleteAccount.cancel").hide();
        this.details.find("button.deleteAccount.confirm").hide();
    },

    deleteAccountConfirm: function() {
        this._disable();

        const self = this;
        Backend.getInstance().deleteUserAsAdmin(
            function(result){
                if (result === true) {
                    if (Users.isAuthenticatedUser(self.playerId)) {
                        // Remove authenticated user.
                        Users.removeAuthenticatedUser(self.playerId);
                    } else if (Users.isGuestUser(self.playerId)) {
                        // Remove guest user.
                        Users.removeGuestUser(self.playerId);
                    }

                    OverlayManager.replaceOverlay(
                        TankTrouble.AdminDashboardOverlay,
                        {adminId: self.adminId}
                    );
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId,
            Caches.getPlayerDetailsCache(),
            Caches.getPlayerDetailsByUsernameCache(),
            Caches.getEmailCache()
        );
    },

    cancelAccountDeletion: function() {
        this._disable();

        const self = this;
        Backend.getInstance().cancelUserDeletion(
            function(result){
                if (result === true) {
                    self._update();
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId
        );
    },

    revertAccountChange: function(accountChangeId) {
        this._disable();

        const self = this;
        Backend.getInstance().revertAccountChange(
            function(result) {
                if (result === true) {
                    self._update();
                    // Signal update.
                    ClientManager.broadcastUpdateUserByAdmin(self.adminId, self.playerId, false, true, false);
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            accountChangeId,
            Caches.getPlayerDetailsCache(),
            Caches.getEmailCache(),
            Caches.getCurrencyCache()
        );
    },

    refundPurchase: function(purchaseId) {
        this._disable();

        const self = this;
        Backend.getInstance().refundPurchase(
            function(result){
                if (result === true) {
                    self._update();
                    // Send signal that user was potentially updated.
                    ClientManager.broadcastUpdateUserByAdmin(self.adminId, self.playerId, false, false, true);
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId,
            purchaseId,
            Caches.getPlayerDetailsCache(),
            Caches.getCurrencyCache(),
            Caches.getVirtualShopCache(),
            Caches.getGarageContentCache()
        );
    },

    refundGoldPurchase: function(purchaseId) {
        this._disable();

        const self = this;
        Backend.getInstance().refundGoldPurchase(
            function(result){
                if (result === true) {
                    self._update();
                    // Send signal that user was potentially updated.
                    ClientManager.broadcastUpdateUserByAdmin(self.adminId, self.playerId, false, false, true);
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId,
            purchaseId,
            Caches.getCurrencyCache(),
            Caches.getVirtualShopCache()
        );
    },

    refundVirtualPurchase: function(purchaseId) {
        this._disable();

        const self = this;
        Backend.getInstance().refundVirtualPurchase(
            function(result){
                if (result === true) {
                    self._update();
                    // Send signal that user was potentially updated.
                    ClientManager.broadcastUpdateUserByAdmin(self.adminId, self.playerId, false, false, true);
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId,
            purchaseId,
            Caches.getCurrencyCache(),
            Caches.getVirtualShopCache(),
            Caches.getGarageContentCache()
        );
    },

    _update: function() {
        this.details.empty();
        this.adminLogs.empty();
        this.logs = [];
        this.logsLoaded = 0;

        const self = this;

        // Get details.
        Backend.getInstance().getSensitivePlayerDetails(
            function(result) {
                if (typeof(result) == "object") {
                    self.details.append(result.data.html);
                    self.details.find('button.cancel, button.confirm, input.editEmail').hide();

                    const garageButton = $('<button/>').attr({
                        "class": "small",
                        type: "button",
                        tabindex: "-1",
                        onclick: "OverlayManager.pushOverlay(TankTrouble.GarageOverlay, { playerId: '" + self.playerId + "' })"
                    });
                    garageButton.text('Garage');
                    const achievementsButton = $('<button/>').attr({
                        "class": "small",
                        type: "button",
                        tabindex: "-1",
                        onclick: "OverlayManager.pushOverlay(TankTrouble.AchievementsOverlay, { playerId: '" + self.playerId + "' })"
                    });
                    achievementsButton.text('Achievements');
                    self.details.find('div.section').eq(1).append([garageButton, achievementsButton]);
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            this.playerId
        );

        // Get admin logs where player is target id.
        Backend.getInstance().getAdminLogs(
            function(result) {
                if (typeof(result) == 'object') {
                    self.logs = self.logs.concat(result.adminLogs);
                    self.logsLoaded++;
                    if (self.logsLoaded == 2) {
                        self._showLogs();
                    }
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            null,
            null,
            [this.playerId],
            null,
            0,
            100
        );

        // Get admin logs where player is admin id.
        Backend.getInstance().getAdminLogs(
            function(result) {
                if (typeof(result) == 'object') {
                    self.logs = self.logs.concat(result.adminLogs);
                    self.logsLoaded++;
                    if (self.logsLoaded == 2) {
                        self._showLogs();
                    }
                } else {
                    self._handleError(result);
                }
            },
            function(result) {
                self._handleError(result);
            },
            null,
            this.adminId,
            [this.playerId],
            null,
            null,
            null,
            0,
            100
        );

    },

    _showLogs: function() {
        // Sort the logs, newest first.
        this.logs.sort(function(a, b) {
            return b.id - a.id;
        });

        // Remove duplicates. Works because elements are sorted.
        this.logs = this.logs.filter(function(elm, index, array){
            return index == 0 || elm['id'] != array[index - 1]['id'];
        });

        // Add sub header.
        if (this.logs.length > 100) {
            this.adminLogs.append('<div class="subHeader">Log <span class="note">(Latest 100 of ' + this.logs.length + ')</span></div>');
        } else if (this.logs.length > 0) {
            this.adminLogs.append('<div class="subHeader">Log</div>');
        } else {
            this.adminLogs.append('<div class="subHeader">No log</div>');
        }

        // Show maximum 100 logs.
        this.logs.slice(0, 100);

        for (let i = 0; i < this.logs.length; i++) {
            this.adminLogs.append(this.logs[i]['html']);
        }
    },

    _positionTankIcon: function() {
        const icon = this.details.find('.icon');
        if (self.wrapper.position().top + icon.parent().height() - icon.height() - 20 < 0) {
            $('.admin.playerLookup .icon').removeClass('fixed');
        } else {
            $('.admin.playerLookup .icon').addClass('fixed');
        }
    },

    _disable: function() {
        this.enabled = this.details.find('button:enabled, input:enabled');
        this.enabled.prop('disabled', true);
    },

    _enable: function() {
        this.enabled.prop('disabled', false);
    },

    _handleError: function(message) {
        alert(message);

        this._enable();
    }
};
