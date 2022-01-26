var UITankIconLoader = Classy.newClass().name("UITankIconLoader");

UITankIconLoader.fields({
    
    canvas: null,
    size: null,
    cb: null,
    context: null,
    
    numImages: 0,
    numImagesLoaded: 0,
    parts: {},
    colours: {},
    accessories: {},
    started: false
});

UITankIconLoader.classFields({
    imageCache: {}
});

UITankIconLoader.constructor(function(canvas, size) {
    this.canvas = canvas;
    this.size = size;
    
    this._queueImage('assets/images/tankIcon/', UIConstants.TANK_ICON_PARTS.TURRET, "", this.parts);
    this._queueImage('assets/images/tankIcon/', UIConstants.TANK_ICON_PARTS.BARREL, "", this.parts);
    this._queueImage('assets/images/tankIcon/', UIConstants.TANK_ICON_PARTS.LEFT_TREAD, "", this.parts);
    this._queueImage('assets/images/tankIcon/', UIConstants.TANK_ICON_PARTS.RIGHT_TREAD, "", this.parts);
    this._queueImage('assets/images/tankIcon/', UIConstants.TANK_ICON_PARTS.BASE, "", this.parts);
    this._queueImage('assets/images/tankIcon/', UIConstants.TANK_ICON_PARTS.TURRET_SHADE, "", this.parts);
    this._queueImage('assets/images/tankIcon/', UIConstants.TANK_ICON_PARTS.BARREL_SHADE, "", this.parts);
    this._queueImage('assets/images/tankIcon/', UIConstants.TANK_ICON_PARTS.LEFT_TREAD_SHADE, "", this.parts);
    this._queueImage('assets/images/tankIcon/', UIConstants.TANK_ICON_PARTS.RIGHT_TREAD_SHADE, "", this.parts);
    this._queueImage('assets/images/tankIcon/', UIConstants.TANK_ICON_PARTS.BASE_SHADE, "", this.parts);
});

UITankIconLoader.methods({
    queueColour: function(tintPart, colour) {
        if (colour.type === 'numeric') {
            // Reformat number to make it edible for canvas operations.
            var hashColour = colour.numericValue.substr(2);
            hashColour = "#" + new Array(6 - hashColour.length + 1).join("0") + hashColour;

            // Store colour in output colours.
            this.colours[tintPart] = hashColour;
        } else {
            this._queueImage('assets/images/colours/', 'colour', colour.imageValue, this.colours, tintPart);
        }
    },
    
    queueAccessory: function(part, accessory) {
        if (accessory !== null && accessory !== undefined && accessory !== "0") {
            this._queueImage('assets/images/accessories/', part, accessory, this.accessories)
        }
    },
    
    onReady: function(cb, context) {
        this.cb = cb;
        this.context = context;
    },
    
    start: function() {
        this.started = true;
        this._checkIfDone();
    },
    
    _queueImage: function(basePath, part, image, output, customKey) {
        var key = part;

        if (customKey !== undefined) {
            key = customKey;
        }

        // Check image cache.
        var cachedImage = UITankIconLoader.imageCache[part + image + "-" + this.size];
        if (cachedImage === undefined) {
            // Make request for image.
            var imageName = basePath + part + image + "-" + UIConstants.TANK_ICON_RESOLUTIONS[this.size];
            var src = g_url(imageName + ".png");
            var srcset = g_url(imageName + "@2x.png") + " 2x";
            var imageElement = $("<img src='" + src + "' srcset='" + srcset + "' crossorigin='anonymous'/>");
            
            var self = this;
            imageElement.load(function() {
                // Store image in output.
                output[key] = imageElement[0];

                // Store image in cache.
                UITankIconLoader.imageCache[part + image + "-" + self.size] = imageElement[0];

                // Count as loaded.
                ++self.numImagesLoaded;
                
                self._checkIfDone();
            });
            imageElement.error(function() {
                ++self.numImagesLoaded;

                self._checkIfDone();
            });
        } else {
//            console.log("Image cached: " + basePath + part + image + "-" + UIConstants.TANK_ICON_RESOLUTIONS[this.size] + ".png");
            // Store image in output.
            output[key] = cachedImage;
            // Count as loaded.
            ++this.numImagesLoaded;
        }
            
        // Add to image count.
        ++this.numImages;
    },
    
    _checkIfDone: function() {
        if (this.numImagesLoaded == this.numImages) {
            // Done, so fire the onReady function.
            this.cb(this.context);
            
            // And draw the tank icon.
            UITankIcon.drawTankIcon(this.canvas, 
                this.colours[UIConstants.TANK_ICON_TINT_PARTS.TURRET], this.colours[UIConstants.TANK_ICON_TINT_PARTS.TREAD], this.colours[UIConstants.TANK_ICON_TINT_PARTS.BASE],
                this.parts[UIConstants.TANK_ICON_PARTS.TURRET], this.parts[UIConstants.TANK_ICON_PARTS.BARREL],
                this.parts[UIConstants.TANK_ICON_PARTS.LEFT_TREAD], this.parts[UIConstants.TANK_ICON_PARTS.RIGHT_TREAD],
                this.parts[UIConstants.TANK_ICON_PARTS.BASE],
                this.parts[UIConstants.TANK_ICON_PARTS.TURRET_SHADE], this.parts[UIConstants.TANK_ICON_PARTS.BARREL_SHADE],
                this.parts[UIConstants.TANK_ICON_PARTS.LEFT_TREAD_SHADE], this.parts[UIConstants.TANK_ICON_PARTS.RIGHT_TREAD_SHADE],
                this.parts[UIConstants.TANK_ICON_PARTS.BASE_SHADE],
                this.accessories[UIConstants.TANK_ICON_ACCESSORY_PARTS.TURRET], this.accessories[UIConstants.TANK_ICON_ACCESSORY_PARTS.BARREL],
                this.accessories[UIConstants.TANK_ICON_ACCESSORY_PARTS.FRONT], this.accessories[UIConstants.TANK_ICON_ACCESSORY_PARTS.BACK],
                this.accessories[UIConstants.TANK_ICON_ACCESSORY_PARTS.TREAD], this.accessories[UIConstants.TANK_ICON_ACCESSORY_PARTS.BACKGROUND],
                this.accessories[UIConstants.TANK_ICON_ACCESSORY_PARTS.BADGE]);
        }
    }
    
});