var TankTrouble = TankTrouble || {}; // eslint-disable-line no-var

TankTrouble.VirtualShopOverlay = {
    wrapper: null,
    logo: null,
    navigation: null,
    itemList: null,
    form: null,
    submit: null,

    // State.
    initialized: false,
    showing: false,
    playerId: null,
    shopItems: null,

    // Events.
    eventListeners: [],
    EVENTS: {
        OPENED: "opened",
        CLOSED: "closed",
        ITEM_LIST_CHANGED: "item list changed"
    },

    _initialize: function() {
        this.wrapper = $("<div class='virtualShop centre'/>");
        this.logo = $("<img class='logo' src='" + g_url("assets/images/virtualShop/dimitrisEmporium.png") + "' srcset='" + g_url("assets/images/virtualShop/dimitrisEmporium@2x.png") + " 2x'/>");
        this.navigation = ButtonGroup.create(["Today's special", "Dimitri's favourites", "Flags of the world"], this.updateItemList, this);
        this.wallet = $("<div class='wallet'><button class='medium disabled'>Loading ...</button></div>")
        this.itemList = $("<div></div>");
        this.form = $("<form></form>");
        this.submit = $("<button id='doneVirtualShopItemButton' class='medium' type='submit' tabindex='-1'>Done</button>");

        Utils.addOverlayFormRow(this.form, this.submit);

        this.navigation.append(this.wallet);
        this.wrapper.append(
            this.logo,
            $("<div/>").append(this.navigation),
            this.itemList,
            this.form
        );

        this.form.submit(function(event) {
            OverlayManager.popOverlay(true, false);
            return false;
        });

        this.initialized = true;
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

    /** Expected params:
     * playerId
     */
    show: function(params) {
        if (!this.initialized) {
            this._initialize();
        }

        // Store playerId.
        this.playerId = params.playerId;

        // Reset submit button.
        this.submit.prop("disabled", false);

        // Reset state.
        this.navigation.hide();
        this.shopItems = [];
        this.itemList.hide();
        this.itemList.empty();

        const self = this;

        Backend.getInstance().getVirtualShopItems(
            function(result) {
                if (Array.isArray(result)) {
                    self.shopItems = result;
                    ButtonGroup.setSelection(self.navigation, 0);

                    Backend.getInstance().getCurrency(
                        function(res) {
                            if (typeof res == 'object') {
                                const button = self.wallet.find("button");
                                button.empty();

                                Utils.addImageWithClasses(button, "", "assets/images/virtualShop/gold.png");
                                button.append(res.getGold());
                                Utils.addImageWithClasses(button, "", "assets/images/virtualShop/diamond.png");
                                button.append(res.getDiamonds());
                                //self.wallet.find('button').html(`<img src="${ g_url('assets/images/virtualShop/gold.png') }"></img>${res.getGold()}`);
                                //console.log(res.getGold(), res.getDiamonds());
                            }
                        },
                        function(res){
                            // Error
                        },
                        function(res) {
                            // Complete
                        },
                        self.playerId,
                        Caches.getCurrencyCache()
                    );
                } else {
                    TankTrouble.ErrorBox.show(result);

                    OverlayManager.popOverlay(false, true);
                }
            },
            function(result) {
                // Error
            },
            function(result) {
                // Complete
            },
            this.playerId,
            Caches.getVirtualShopCache()
        );

        this.showing = true;

        this._notifyEventListeners(TankTrouble.VirtualShopOverlay.EVENTS.OPENED, this.playerId);
    },

    hide: function() {
        if (!this.initialized) {
            this._initialize();
        }

        this.showing = false;

        this._notifyEventListeners(TankTrouble.VirtualShopOverlay.EVENTS.CLOSED, this.playerId);
    },

    isShowing: function() {
        return this.showing;
    },

    getPlayerId: function() {
        return this.playerId;
    },

    getItemListLabel: function() {
        if (!this.initialized) {
            this._initialize();
        }

        return ButtonGroup.getSelectionLabel(this.navigation);
    },

    getContents: function() {
        if (!this.initialized) {
            this._initialize();
        }

        return this.wrapper;
    },

    shouldHide: function() {
        if (!this.initialized) {
            this._initialize();
        }

        return (this.submit.prop("disabled") == false);
    },

    canBeCancelled: function() {
        return true;
    },

    updateItemList: function(filter) {
        this.itemList.hide();
        this.itemList.empty();

        const promoted = [];
        const passed = [];

        for (let i = 0; i < this.shopItems.length; ++i) {
            let filterPassed = true;

            if (filter == 0) {
                // Special - everything that is not always available.
                filterPassed &= this.shopItems[i].availability != "always";
            } else if (filter == 1) {
                // Dimitri's favourites - everything but flags.
                filterPassed &= this.shopItems[i].tags.indexOf("flag") == -1;
                filterPassed &= !this.shopItems[i].soldOut;
            } else if (filter == 2) {
                // Flags of the world - only flags.
                filterPassed &= this.shopItems[i].tags.indexOf("flag") > -1;
                filterPassed &= !this.shopItems[i].soldOut;
            }

            if (filterPassed) {
                if (ArrayUtils.containsSome(this.shopItems[i].tags, ["mostPopular", "anniversary", "halloweenBox", "4thOfJuly"])) {
                    promoted.push(this.shopItems[i].html["virtualShopItem"]);
                } else {
                    passed.push(this.shopItems[i].html["virtualShopItem"]);
                }
            }
        }

        if (promoted.length + passed.length > 0) {
            this.itemList.append(promoted);
            this.itemList.append(passed);
        } else {
            this.itemList.html("It looks like you already bought everything in this category<br><br>Dimitri appreciates your patronage")
        }

        this.navigation.show();
        this.itemList.show();

        this._notifyEventListeners(TankTrouble.VirtualShopOverlay.EVENTS.ITEM_LIST_CHANGED, this.playerId);
    },

    _notifyEventListeners: function(evt, data) {
        for (let i = 0; i < this.eventListeners.length; i++) {
            this.eventListeners[i].cb(this.eventListeners[i].ctxt, evt, data);
        }
    }
};
