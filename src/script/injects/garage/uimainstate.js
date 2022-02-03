const Garage = Garage || {};

Garage.UIMainState = Classy.newClass();

/*
 * Phaser fills in some properties:
 *  - game - a reference to the Phaser.Game
 *  - input - a reference to the Phaser.Input input manager
 *
*/

Garage.UIMainState.constructor(function(playerId) {
    if (playerId !== undefined) {
        this.playerId = playerId;
    }
});

Garage.UIMainState.fields({
    playerId: null,

    sprayCanSound: null,
    shakeCanSound: null,

    playerIdToContent: {},
    accessoryToWelderPoints: null,

    boxDictionary: {},

    selectedPlayerId: null,

    currentTankIconSprites: [],
    selectedTankIcon: null,
    tankIconScroller: null,
    tankIconSprites: {},

    openBoxEvent: null,
    currentBoxSprites: [],
    selectedBox: null,
    boxScroller: null,
    boxSprites: {},

    currentAccessorySprites: [],
    accessoryScroller: null,
    accessorySprites: {},

    currentSprayCanSprites: [],
    selectedSprayCan: null,

    tankIconGroup: null,
    sprayCanGroup: null,
    accessoryGroup: null,
    boxGroup: null,

    sprayEmitters: [],
    welderSmokeEmitter: null,
    welderSparkEmitter: null,

    currentSprayEmitter: 0,

    floor: null,

    log: null
});

Garage.UIMainState.methods({
    preload: function() {

    },

    init: function(playerIdToContent, accessoryToWelderPoints) {
        this.playerIdToContent = playerIdToContent;
        this.accessoryToWelderPoints = accessoryToWelderPoints;

        // Build a dictionary of boxes.
        this.boxDictionary = {};
        for (const playerId in this.playerIdToContent) {
            this.boxDictionary[playerId] = {};
            const content = this.playerIdToContent[playerId];
            for (let i = 0; i < content.boxes.length; ++i) {
                const box = content.boxes[i];
                this.boxDictionary[playerId][box.id] = box;
            }
        }
    },

    create: function() {
        // Create log.
        this.log = Log.create('UIMainState');

        // FIXME This should be done in shutdown in general!
        // FIXME This should be done in shutdown in general!
        // FIXME This should be done in shutdown in general!
        // FIXME This should be done in shutdown in general!
        // Clean old state.
        this.accessorySprites = {};
        this.boxSprites = {};
        this.selectedPlayerId = null;
        this.selectedBox = null;
        this.sprayEmitters = [];

        // Create tank group to hold all tank icons.
        this.tankIconGroup = this.game.add.group();

        let playerIds = [];
        // If a player id was specified, only show that player.
        // Otherwise, show all users.
        if (this.playerId !== null) {
            playerIds.push(this.playerId);
        } else {
            // Use Users since the order of playerIdToContent cannot be counted on.
            playerIds = Users.getAllPlayerIds();
        }

        // Add all tank icons.
        for (let i = 0; i < playerIds.length; ++i) {
            const tankIconSprite = this.tankIconGroup.add(new UIGarageTankIconImage(this.game, playerIds[i], this._checkTankHit, this));
            this.tankIconSprites[playerIds[i]] = tankIconSprite;
        }

        // Add tank icon scroller
        this.tankIconScroller = this.tankIconGroup.add(
            new UIScrollerGroup(
                this.game,
                UIConstants.TANK_ICON_WIDTH_LARGE,
                UIConstants.TANK_ICON_HEIGHT_LARGE,
                true,
                UIConstants.GARAGE_TANK_ICON_SCROLL_SPEED,
                this._tankIconSpawn,
                null,
                this
            )
        );

        // Add welder spark emitter.
        this.welderSparkEmitter = this.game.add.existing(new UIWelderSparkEmitter(this.game));

        // Add welder smoke emitter.
        this.welderSmokeEmitter = this.game.add.existing(new UIWelderSmokeEmitter(this.game));

        // Add spray emitters.
        // Use two emitters to be able to swip-swap between them.
        UISprayCanParticle.setCurrentEmitter(0);
        this.sprayEmitters.push(this.game.add.existing(new UISprayCanEmitter(this.game)));
        UISprayCanParticle.setCurrentEmitter(1);
        this.sprayEmitters.push(this.game.add.existing(new UISprayCanEmitter(this.game)));

        // Create spray can group to hold all spray cans.
        this.sprayCanGroup = this.game.add.group();

        // Add pool of spray cans.
        for (let i = 0; i < UIConstants.SPRAY_CAN_POOL_SIZE; ++i) {
            this.sprayCanGroup.add(new UISprayCanImage(this.game, this._setSprayCanSelection, this._checkSprayCanHit, this.sprayEmitters, this));
        }

        // Add floor for particle effects.
        // FIXME Adjust width to game width on resize.
        this.floor = this.game.add.existing(new Phaser.Sprite(this.game, 0, 0, this.game.make.bitmapData(this.game.width, 10)));
        this.floor.anchor.setTo(0.5, 0.5);
        this.game.physics.enable(this.floor, Phaser.Physics.ARCADE);
        this.floor.body.immovable = true;

        // Create accessory group to hold all accessories.
        this.accessoryGroup = this.game.add.group();

        // Add all accessories
        for (let i = 0; i < playerIds.length; ++i) {
            const content = this.playerIdToContent[playerIds[i]];
            for (let j = 0; j < content.boxes.length; ++j) {
                const box = content.boxes[j];
                for (let k = 0; k < box.accessories.length; ++k) {
                    if (!this.accessorySprites[box.accessories[k].type+box.accessories[k].value]) {
                        const accessorySprite = this.accessoryGroup.add(new UIAccessoryImage(this.game, box.accessories[k].type, box.accessories[k].value, this._setAccessorySelection, this.welderSmokeEmitter, this.welderSparkEmitter, this.accessoryToWelderPoints, this));
                        this.accessorySprites[box.accessories[k].type+box.accessories[k].value] = accessorySprite;
                    }
                }
            }
        }

        // Add accessory scroller
        this.accessoryScroller = this.accessoryGroup.add(new UIScrollerGroup(this.game, UIConstants.ACCESSORY_WIDTH, UIConstants.ACCESSORY_HEIGHT, false, UIConstants.GARAGE_ACCESSORY_SCROLL_SPEED));

        // Create box group to hold all boxes.
        this.boxGroup = this.game.add.group();

        // Add all boxes.
        for (let i = 0; i < playerIds.length; ++i) {
            this.boxSprites[playerIds[i]] = {};
        }
        for (let i = 0; i < playerIds.length; ++i) {
            const content = this.playerIdToContent[playerIds[i]];
            for (let j = 0; j < content.boxes.length; ++j) {
                const box = content.boxes[j];
                const boxSprite = this.boxGroup.add(new UIBoxImage(this.game, box.id, this._setBoxSelection, this));
                this.boxSprites[playerIds[i]][box.id] = boxSprite;
            }
        }

        // Add box scroller
        this.boxScroller = this.boxGroup.add(new UIScrollerGroup(this.game, UIConstants.GARAGE_BOX_WIDTH, UIConstants.GARAGE_BOX_HEIGHT * 0.5, false, UIConstants.GARAGE_BOX_SCROLL_SPEED));

        this.scale.onSizeChange.add(this._onSizeChangeHandler, this);

        // Spawn tank icons.
        this._updateTankIcons();

        Users.addEventListener(this._authenticationEventHandler, this);

        // Handle scaling.
        this._onSizeChangeHandler();
    },

    shutdown: function() {
        this._retireUI();

        Users.removeEventListener(this._authenticationEventHandler, this);

        this.scale.onSizeChange.remove(this._onSizeChangeHandler, this);
    },

    getAccessoryPosition: function(type, number) {
        for (let i = 0; i < this.currentAccessorySprites.length; ++i) {
            const accessorySprite = this.currentAccessorySprites[i];
            if (accessorySprite.getType() == type && accessorySprite.getNumber() == number) {

                if (accessorySprite.alive && !accessorySprite.busy) {

                    const gameBounds = this.game.scale.bounds;
                    const position = accessorySprite.toGlobal(new Phaser.Point(0, 0));

                    // Scale from game canvas position to pixel position.
                    Phaser.Point.divide(position, this.game.scale.scaleFactor, position);

                    return {x: gameBounds.x + position.x, y: gameBounds.y + position.y};
                }

                return undefined;
            }
        }

        return undefined;
    },

    _onSizeChangeHandler: function() {
        this.log.debug("SIZE CHANGE!");

        // FIXME Handle scaling of stuff!
        this.tankIconGroup.position.x = this.game.width/2;
        this.tankIconGroup.position.y = UIConstants.GARAGE_TANK_ICON_MARGIN;

        this.floor.position.x = this.game.width/2;
        this.floor.position.y = UIConstants.GARAGE_TANK_ICON_MARGIN + UIConstants.TANK_ICON_HEIGHT_LARGE/2;

        this.sprayCanGroup.position.x = this.game.width/2;
        this.sprayCanGroup.position.y = this.game.height/2.5;
        this.sprayCanGroup.callAll('setOverallScale', null, 0.9);

        // Update drag rects for spray cans.
        this.sprayCanGroup.setAll('input.boundsRect', new Phaser.Rectangle(-this.sprayCanGroup.position.x + UIConstants.SPRAY_CAN_DRAG_MARGIN,
                                                                     -this.sprayCanGroup.position.y + UIConstants.SPRAY_CAN_DRAG_MARGIN,
                                                                     this.game.width - UIConstants.SPRAY_CAN_DRAG_MARGIN * 2,
                                                                     this.game.height/1.97 // Same as accessory group y
                                                                    ));

        this.accessoryGroup.position.x = this.game.width/2;
        this.accessoryGroup.position.y = this.game.height/1.97;

        this.boxGroup.position.x = this.game.width/2;
        this.boxGroup.position.y = this.game.height/1.4;
    },

    _authenticationEventHandler: function(self, evt, data) {
        self.log.debug("Authentication event: " + evt + ": " + data);
        switch(evt) {
            case Users.EVENTS.GUEST_ADDED:
            case Users.EVENTS.GUESTS_ADDED:
            case Users.EVENTS.PLAYER_AUTHENTICATED:
            {
                self.state.start('Load');

                break;
            }
            case Users.EVENTS.GUEST_REMOVED:
            case Users.EVENTS.PLAYER_DEAUTHENTICATED:
            {
                // If a player id was specified, and the logged out player is that player, assume that the garage overlay is open for that player and close it.
                if (self.playerId === data) {
                    OverlayManager.popOverlay(false, true);
                } else {
                    const playerIds = Users.getAllPlayerIds();
                    // Check if no players are left.
                    if (playerIds.length == 0) {
                        self.state.start('NoUsers');
                    } else {
                        self._updateTankIcons();
                    }
                }
                break;
            }
        }
    },

    _tankIconSpawn: function(tankIcon) {
        this._setTankIconSelection(tankIcon, this);
    },

    _updateTankIcons: function() {
        let playerIds = [];
        // If a player id was specified, only show that player.
        // Otherwise, show all users.
        if (this.playerId !== null) {
            playerIds.push(this.playerId);
        } else {
            // Use Users since the order of playerIdToContent cannot be counted on.
            playerIds = Users.getAllPlayerIds();
        }

        // Remove old tank icons.
        this.tankIconGroup.callAll('remove');
        this.currentTankIconSprites = [];

        // Spawn tank icons.
        const tankIconCount = playerIds.length;
        const visibleTankIconCount = 1;

        let tankIconNumber = 0;
        for (let i = 0; i < tankIconCount; ++i) {
            const tankIconSprite = this.tankIconSprites[playerIds[i]];
            if (tankIconNumber < visibleTankIconCount) {
                tankIconSprite.spawn(
                    UIConstants.TANK_ICON_WIDTH_LARGE * -(visibleTankIconCount - 1) / 2 + UIConstants.TANK_ICON_WIDTH_LARGE * tankIconNumber,
                    0
                );
            }
            this.currentTankIconSprites.push(tankIconSprite);
            ++tankIconNumber;
        }

        // If there is more than one player, we need to spawn a scroller layer.
        if (visibleTankIconCount < tankIconCount) {
            this.tankIconScroller.spawn(0, 0, this.currentTankIconSprites, 0, visibleTankIconCount - 1, 0);
        }

        // Set first tank to be selected.
        if (playerIds.length > 0) {
            if (playerIds[0] !== this.selectedPlayerId) {
                this._setTankIconSelection(this.tankIconSprites[playerIds[0]], this);
            }
        }
    },

    _setTankIconSelection: function(tankIcon, self) {
        self.selectedTankIcon = tankIcon;
        self.selectedPlayerId = tankIcon.getPlayerId();

        // Remove old boxes.
        self.boxGroup.callAll('remove');

        self.currentBoxSprites = [];

        // Close selected box if any.
        if (self.selectedBox) {
            self.selectedBox.closeBox();
            self.selectedBox = null;
        }

        // Cancel old open box timed event.
        if (self.openBoxEvent) {
            self.game.time.events.remove(self.openBoxEvent);
            self.openBoxEvent = null;
        }

        // Remove old spray cans.
        self.sprayCanGroup.callAll('remove');
        self.currentSprayCanSprites = [];
        self.selectedSprayCan = null;

        // Remove old accessories.
        self.accessoryGroup.callAll('remove');
        self.currentAccessorySprites = [];

        // Remove any welders.
        self.welderSmokeEmitter.remove();
        self.welderSparkEmitter.remove();

        // Remove any sprays.
        self.sprayEmitters[0].remove();
        self.sprayEmitters[1].remove();

        // Spawn boxes.
        const content = self.playerIdToContent[self.selectedPlayerId];
        const boxCount = content.boxes.length;

        const visibleBoxCount = Math.min(boxCount, UIConstants.BOXES_PER_ROW);

        let boxNumber = 0;
        for (let i = 0; i < boxCount; ++i) {
            const boxSprite = this.boxSprites[self.selectedPlayerId][content.boxes[i].id];
            if (boxNumber < visibleBoxCount) {
                boxSprite.spawn(
                    UIConstants.GARAGE_BOX_WIDTH * -(visibleBoxCount - 1) / 2 + UIConstants.GARAGE_BOX_WIDTH * boxNumber,
                    0,
                    true,
                    UIConstants.BASE_BOX_SPAWN_DELAY + UIConstants.PER_BOX_SPAWN_DELAY * boxNumber
                );
            }
            this.currentBoxSprites.push(boxSprite);
            ++boxNumber;
        }

        // If there are too many boxes to fit, we need to spawn a scroller layer.
        if (visibleBoxCount < boxCount) {
            this.boxScroller.spawn(
                0,
                -UIConstants.GARAGE_BOX_HEIGHT * 0.2,
                this.currentBoxSprites,
                0,
                visibleBoxCount - 1,
                1000);
        }

        // Open box.
        this.openBoxEvent = self.game.time.events.add(1000, function() {
            self._setBoxSelection(self.currentBoxSprites[0], self);
            self.openBoxEvent = null;
        });
    },

    _setBoxSelection: function(box, self) {
        // Cancel old open box timed event.
        if (self.openBoxEvent) {
            self.game.time.events.remove(self.openBoxEvent);
            self.openBoxEvent = null;
        }

        if (box) {
            self.boxGroup.callAll('deselect');
            self.boxGroup.callAll('closeBox');
            box.select();
            box.openBox();
            self.selectedBox = box;
        }

        const boxContent = self.boxDictionary[self.selectedPlayerId][box.getId()];

        // Remove old spray cans.
        self.sprayCanGroup.callAll('remove');
        self.currentSprayCanSprites = [];
        self.selectedSprayCan = null;

        // Spawn new spray cans.
        const sprayCanCount = boxContent.sprayCans.length;

        let sprayCanNumber = 0;
        for (let i = 0; i < boxContent.sprayCans.length; ++i) {
            const sprayCanSprite = self.sprayCanGroup.getFirstExists(false);
            if (sprayCanSprite) {
                self.currentSprayCanSprites.push(sprayCanSprite);
                sprayCanSprite.spawn(
                    UIConstants.SPRAY_CAN_WIDTH * -(sprayCanCount - 1) / 2 + UIConstants.SPRAY_CAN_WIDTH * sprayCanNumber,
                    0,
                    boxContent.sprayCans[i].colour,
                    true,
                    UIConstants.PER_SPRAY_CAN_SPAWN_DELAY * sprayCanNumber
                );
                ++sprayCanNumber;
            }
        }

        // Remove old accessories.
        self.accessoryGroup.callAll('remove');
        self.currentAccessorySprites = [];

        // Spawn new accessories.
        const accessoryCount = boxContent.accessories.length;

        const visibleAccessoryCount = Math.min(accessoryCount, UIConstants.ACCESSORIES_PER_ROW);

        let accessoryNumber = 0;
        for (let i = 0; i < accessoryCount; ++i) {
            const accessorySprite = self.accessorySprites[boxContent.accessories[i].type+boxContent.accessories[i].value];
            // FIXME Ensure that load state loads in all non-hidden accessories of the boxes that should be active for this user.
            // FIXME Then remove this check.
            if (accessorySprite) {
                if (accessoryNumber < visibleAccessoryCount) {
                    const startPosition = self.accessoryGroup.toLocal(self.boxGroup.toGlobal(self.boxSprites[self.selectedPlayerId][box.getId()].position));

                    accessorySprite.spawn(
                        UIConstants.ACCESSORY_WIDTH * -(visibleAccessoryCount - 1) / 2 + UIConstants.ACCESSORY_WIDTH * accessoryNumber,
                        0,
                        true,
                        UIConstants.PER_ACCESSORY_SPAWN_DELAY * (Math.abs(visibleAccessoryCount / 2.0 - accessoryNumber)),
                        startPosition.x,
                        startPosition.y
                    );
                }
                self.currentAccessorySprites.push(accessorySprite);
                ++accessoryNumber;
            }
        }

        // If there are too many accessories to fit, we need to spawn a scroller layer.
        if (visibleAccessoryCount < accessoryCount) {
            // Delay the spawn until all accessories are in place.
            self.accessoryScroller.spawn(
                0,
                0,
                self.currentAccessorySprites,
                0,
                visibleAccessoryCount - 1,
                UIConstants.PER_ACCESSORY_SPAWN_DELAY * (visibleAccessoryCount / 2.0) + UIConstants.ACCESSORY_FLY_OUT_TIME
            );
        }
    },

    update: function() {
    },

    _setSprayCanSelection: function(sprayCan) {
        this.sprayCanGroup.callAll('deselect');
        if (sprayCan) {
            sprayCan.select();
        }
        this.selectedSprayCan = sprayCan;
    },

    _checkSprayCanHit: function(sprayCan, position) {
        const localPosition = this.selectedTankIcon.toLocal(position).divide(this.selectedTankIcon.width, this.selectedTankIcon.height);

        return this._checkTankHitzones(localPosition, sprayCan);
    },

    _checkTankHit: function(sprite, pointer) {
        const localPosition = this.selectedTankIcon.toLocal(pointer.position).divide(this.selectedTankIcon.width, this.selectedTankIcon.height);

        if (this.selectedSprayCan) {
            this._checkTankHitzones(localPosition, this.selectedSprayCan);
        }
    },

    _checkTankHitzones: function(localPosition, sprayCan) {
        if (localPosition.x < -UIConstants.GARAGE_SPRAY_ZONE_OUTSIDE_X || localPosition.x > UIConstants.GARAGE_SPRAY_ZONE_OUTSIDE_X ||
            localPosition.y < UIConstants.GARAGE_SPRAY_ZONE_OUTSIDE_MIN_Y || localPosition.y > UIConstants.GARAGE_SPRAY_ZONE_OUTSIDE_MAX_Y) {
            return false;
        } else if (localPosition.y < UIConstants.GARAGE_SPRAY_ZONE_TURRET_Y) {
            sprayCan.sprayTurret(this.selectedTankIcon, this.tankIconScroller, this.currentSprayEmitter);
            this.currentSprayEmitter = (this.currentSprayEmitter + 1) % 2;
            return true;
        } else if (localPosition.x < UIConstants.GARAGE_SPRAY_ZONE_TREAD_X) {
            sprayCan.sprayTread(this.selectedTankIcon, this.tankIconScroller, this.currentSprayEmitter);
            this.currentSprayEmitter = (this.currentSprayEmitter + 1) % 2;
            return true;
        } else {
            sprayCan.sprayBase(this.selectedTankIcon, this.tankIconScroller, this.currentSprayEmitter);
            this.currentSprayEmitter = (this.currentSprayEmitter + 1) % 2;
            return true;
        }
    },

    _setAccessorySelection: function(accessory) {
        if (accessory) {
            this.accessoryGroup.callAll('deselect', null, accessory.getType());
            if (this.selectedTankIcon.getAccessory(accessory.getType()) != accessory.getNumber()) {
                accessory.select();
            }
            accessory.applyAccessory(this.selectedTankIcon, this.tankIconScroller, this.floor);
        }
    },

    _retireUI: function() {
    },

    _cleanUp: function() {
    }
});
