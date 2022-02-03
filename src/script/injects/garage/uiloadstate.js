const Garage = Garage || {};

Garage.UILoadState = Classy.newClass();

/*
 * Phaser fills in some properties:
 *  - game - a reference to the Phaser.Game
 *  - input - a reference to the Phaser.Input input manager
 *
*/

Garage.UILoadState.constructor(function(playerId) {
    if (playerId !== undefined) {
        this.playerId = playerId;
    }
});

Garage.UILoadState.fields({
    playerId: null,

    waitingIconGroup: null,
    accessoryToWelderPoints: {},
    itemAlreadyQueuedForLoad: {},
    playerIdToGarageContent: {},

    log: null
});

Garage.UILoadState.methods({
    preload: function() {

    },

    create: function() {
        // Create log.
        this.log = Log.create('UILoadState');

        // Create waiting icon.
        this.waitingIconGroup = this.game.add.existing(new UIWaitingIconGroup(this.game));
        this.waitingIconGroup.spawn(this.game.width / 2.0, this.game.height / 3.0, true, "Loading accessories");

        this.load.onFileError.add(this._onFileError, this);

        // Clear map from player id to garage content.
        this.playerIdToGarageContent = {};

        const self = this;

        this.load.onLoadComplete.addOnce(
            function() {
                // FIXME Move this computation into update and do one accessory per frame if it becomes too sluggish.
                const welderSpotsBitmapData = this.game.make.bitmapData(UIConstants.TANK_ICON_WIDTH_LARGE, UIConstants.TANK_ICON_HEIGHT_LARGE);
                const welderSpotsCellCountX = Math.floor(welderSpotsBitmapData.width / UIConstants.WELDER_SAMPLE_CELL_SIZE);
                const welderSpotsCellCountY = Math.floor(welderSpotsBitmapData.height / UIConstants.WELDER_SAMPLE_CELL_SIZE);

                for (const playerId in this.playerIdToGarageContent) {
                    const content = this.playerIdToGarageContent[playerId];

                    for (let i = 0; i < content.boxes.length; ++i) {
                        const box = content.boxes[i];
                        for (let j = 0; j < box.accessories.length; ++j) {
                            const accessory = box.accessories[j];
                            if (!this.accessoryToWelderPoints[accessory.type+accessory.value]) {
                                this.accessoryToWelderPoints[accessory.type+accessory.value] = [];

                                const image = this.game.cache.getImage(accessory.type+accessory.value+'preprocess');
                                welderSpotsBitmapData.clear();
                                welderSpotsBitmapData.draw(image, 0, 0);
                                welderSpotsBitmapData.update();

                                for (let x = 0; x < welderSpotsCellCountX; ++x) {
                                    for (let y = 0; y < welderSpotsCellCountY; ++y) {
                                        const sampleX = Math.floor((x + 0.5) * UIConstants.WELDER_SAMPLE_CELL_SIZE + (Math.random() * 2.0 - 1.0) * UIConstants.WELDER_SAMPLE_JITTER_SIZE);
                                        const sampleY = Math.floor((y + 0.5) * UIConstants.WELDER_SAMPLE_CELL_SIZE + (Math.random() * 2.0 - 1.0) * UIConstants.WELDER_SAMPLE_JITTER_SIZE);

                                        const sample = welderSpotsBitmapData.getPixel32(sampleX, sampleY);

                                        if ((sample >> 24) & 0xff > 0) {
                                            const point = {x: sampleX / UIConstants.TANK_ICON_WIDTH_LARGE - 0.5,
                                                         y: sampleY / UIConstants.TANK_ICON_HEIGHT_LARGE - 0.5}
                                            this.accessoryToWelderPoints[accessory.type+accessory.value].push(point);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                welderSpotsBitmapData.destroy();
                this.state.start('Main', true, false, this.playerIdToGarageContent, this.accessoryToWelderPoints);
            },
            this
        );

        let playerIds = [];
        // If a player id was specified, only load that player.
        // Otherwise, for each user, queue up loading of the garage content.
        if (this.playerId !== null) {
            playerIds.push(this.playerId);
        } else {
            playerIds = Users.getAllPlayerIds();
        }

        let numGarageContentResponses = 0;
        const numExpectedGarageContentResponses = playerIds.length;
        for (let i = 0; i < playerIds.length; ++i) {
            Backend.getInstance().getGarageContent(
                function(result) {
                    // Store resulting content in map.
                    self.playerIdToGarageContent[result.playerId] = result;

                    for (let j = 0; j < result.boxes.length; ++j) {
                        const box = result.boxes[j];

                        // Queue up box icon assets.
                        if (!self.itemAlreadyQueuedForLoad['box'+box.id]) {
                            self.itemAlreadyQueuedForLoad['box'+box.id] = true;
                            if (self.game.device.pixelRatio > 1) {
                                self.load.spritesheet('box'+box.id, g_url('assets/images/boxes/box'+box.id+'-140@2x.png'), 280, 280);
                            } else {
                                self.load.spritesheet('box'+box.id, g_url('assets/images/boxes/box'+box.id+'-140.png'), 140, 140);
                            }
                        }

                        for (let k = 0; k < box.accessories.length; ++k) {
                            const accessory = box.accessories[k];
                            // Queue up accessory icon assets.
                            if (!self.itemAlreadyQueuedForLoad[accessory.type+accessory.value]) {
                                self.itemAlreadyQueuedForLoad[accessory.type+accessory.value] = true;
                                if (self.game.device.pixelRatio > 1) {
                                    self.load.image(accessory.type+accessory.value, g_url('assets/images/accessories/'+accessory.type+accessory.value+'Icon-60@2x.png'));
                                } else {
                                    self.load.image(accessory.type+accessory.value, g_url('assets/images/accessories/'+accessory.type+accessory.value+'Icon-60.png'));
                                }
                                // Queue up accessory assets for preprocessing in onLoadComplete.
                                if (self.game.device.pixelRatio > 1) {
                                    self.load.image(accessory.type+accessory.value+'preprocess', g_url('assets/images/accessories/'+accessory.type+accessory.value+'-320@2x.png'));
                                } else {
                                    self.load.image(accessory.type+accessory.value+'preprocess', g_url('assets/images/accessories/'+accessory.type+accessory.value+'-320.png'));
                                }
                            }
                        }

                        for (let k = 0; k < box.sprayCans.length; ++k) {
                            const sprayCan = box.sprayCans[k];
                            if (sprayCan.colour.type == 'image') {
                                // Queue up image colours.
                                const colourValue = sprayCan.colour.imageValue;
                                if (!self.itemAlreadyQueuedForLoad['colour'+colourValue]) {
                                    self.itemAlreadyQueuedForLoad['colour'+colourValue] = true;
                                    if (self.game.device.pixelRatio > 1) {
                                        self.load.image('colour'+colourValue, g_url('assets/images/colours/colour'+colourValue+'Icon-26@2x.png'));
                                    } else {
                                        self.load.image('colour'+colourValue, g_url('assets/images/colours/colour'+colourValue+'Icon-26.png'));
                                    }

                                }
                            }
                        }
                    }
                },
                function(result) {
                    // FIXME Handle error and stop going further to main state.
                },
                function(result) {
                    // Count that we got a response.
                    ++numGarageContentResponses;
                    // If we have them all, start the asset loader.
                    if (numGarageContentResponses == numExpectedGarageContentResponses) {
                        self.load.start();
                    }
                },
                playerIds[i], Caches.getGarageContentCache()
            );
        }

        Users.addEventListener(this._authenticationEventHandler, this);

        this.scale.onSizeChange.add(this._onSizeChangeHandler, this);
    },

    shutdown: function() {
        this._retireUI();

        Users.removeEventListener(this._authenticationEventHandler, this);

        this.scale.onSizeChange.remove(this._onSizeChangeHandler, this);

        this.load.onFileError.remove(this._onFileError, this);
    },

    _onSizeChangeHandler: function() {
        this.log.debug("SIZE CHANGE!");

        this.waitingIconGroup.position.set(this.game.width / 2.0, this.game.height / 3.0);
    },

    _onFileError: function(key, file) {
        this.log.debug("File error " + key + ": " + file);
    },

    _authenticationEventHandler: function(self, evt, data) {
        self.log.debug("Authentication event: " + evt + ": " + data);
        switch(evt) {
            case Users.EVENTS.GUEST_ADDED:
            case Users.EVENTS.GUESTS_ADDED:
            case Users.EVENTS.PLAYER_AUTHENTICATED:
            {
                self.load.reset(false, true);
                self.state.restart();

                break;
            }
            case Users.EVENTS.GUEST_REMOVED:
            case Users.EVENTS.PLAYER_DEAUTHENTICATED:
            {
                // Check if no players are left.
                if (Users.getAllPlayerIds().length == 0) {
                    self.state.start('NoUsers');
                }
                break;
            }
        }
    },

    update: function() {

    },

    _retireUI: function() {
    },

    _cleanUp: function() {
    }
});
