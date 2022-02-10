var UITankIcon = Classy.newClass().name("UITankIcon");

UITankIcon.classFields({
    compositedBuffer: $("<canvas></canvas>")[0],
    tintedBuffer: $("<canvas></canvas>")[0],
    outlineBuffer: $("<canvas></canvas>")[0],
});

UITankIcon.classMethods({

    loadPlayerTankIcon: function(canvas, size, playerId, onReady, context) {
        Backend.getInstance().getPlayerDetails(
            function(result) {
                if (typeof(result) == "object") {

                    const turretColour = result.getTurretColour();
                    const treadColour = result.getTreadColour();
                    const baseColour = result.getBaseColour();
                    const turretAccessory = result.getTurretAccessory();
                    const barrelAccessory = result.getBarrelAccessory();
                    const frontAccessory = result.getFrontAccessory();
                    const backAccessory = result.getBackAccessory();
                    
                    if (!turretColour || !treadColour || !baseColour || !turretAccessory || !barrelAccessory || !frontAccessory || !backAccessory) {
                        return;
                    }
                    
                    if (onReady && context) {
                        UITankIcon.loadTankIcon(canvas, size, turretColour, treadColour, baseColour,
                            turretAccessory, barrelAccessory, frontAccessory, backAccessory, null, null, null, onReady, context);
                    } else {
                        UITankIcon.loadTankIcon(canvas, size, turretColour, treadColour, baseColour,
                            turretAccessory, barrelAccessory, frontAccessory, backAccessory, null, null, null, function (self) {}, self);
                    }
                } else {
                    if (onReady && context) {
                        UITankIcon.loadTankIcon(canvas, size, UIConstants.TANK_UNAVAILABLE_COLOUR, UIConstants.TANK_UNAVAILABLE_COLOUR, UIConstants.TANK_UNAVAILABLE_COLOUR,
                            null, null, null, null, null, null, null, onReady, context);
                    } else {
                        UITankIcon.loadTankIcon(canvas, size, UIConstants.TANK_UNAVAILABLE_COLOUR, UIConstants.TANK_UNAVAILABLE_COLOUR, UIConstants.TANK_UNAVAILABLE_COLOUR,
                            null, null, null, null, null, null, null, function (self) {}, self);
                    }
                }
            },
            function() {},
            function() {},
            playerId,
            Caches.getPlayerDetailsCache()
        );
    },

    loadTankIcon: function(canvas, size, turretColour, treadColour, baseColour,
        turretAccessory, barrelAccessory, frontAccessory, backAccessory, treadAccessory, backgroundAccessory, badge,
        onReady, context) {
            const loader = UITankIconLoader.create(canvas, size);
            
            loader.queueColour(UIConstants.TANK_ICON_TINT_PARTS.TURRET, turretColour);
            loader.queueColour(UIConstants.TANK_ICON_TINT_PARTS.TREAD, treadColour);
            loader.queueColour(UIConstants.TANK_ICON_TINT_PARTS.BASE, baseColour);
            
            loader.queueAccessory(UIConstants.TANK_ICON_ACCESSORY_PARTS.TURRET, turretAccessory);
            loader.queueAccessory(UIConstants.TANK_ICON_ACCESSORY_PARTS.BARREL, barrelAccessory);
            loader.queueAccessory(UIConstants.TANK_ICON_ACCESSORY_PARTS.FRONT, frontAccessory);
            loader.queueAccessory(UIConstants.TANK_ICON_ACCESSORY_PARTS.BACK, backAccessory);
            loader.queueAccessory(UIConstants.TANK_ICON_ACCESSORY_PARTS.TREAD, treadAccessory);
            loader.queueAccessory(UIConstants.TANK_ICON_ACCESSORY_PARTS.BACKGROUND, backgroundAccessory);
            loader.queueAccessory(UIConstants.TANK_ICON_ACCESSORY_PARTS.BADGE, badge);
            
            loader.onReady(onReady, context);
            
            loader.start();
    },

    drawTankIcon: function(canvas, turretColour, treadColour, baseColour, turret, barrel, leftTread, rightTread, base,
        turretShade, barrelShade, leftTreadShade, rightTreadShade, baseShade,
        turretAccessory, barrelAccessory, frontAccessory, backAccessory, treadAccessory, backgroundAccessory, badge) {
        
        const context = canvas.getContext( "2d" );

        // setup offscreen buffer for composited tank
        if (canvas.width != this.compositedBuffer.width || canvas.height != this.compositedBuffer.height)
        {
            this.compositedBuffer.width = canvas.width;
            this.compositedBuffer.height = canvas.height;
        }

        const compositedContext = this.compositedBuffer.getContext('2d');
        compositedContext.clearRect(0, 0, canvas.width, canvas.height);

        // setup offscreen buffer for tinted components.
        if (canvas.width != this.tintedBuffer.width || canvas.height != this.tintedBuffer.height)
        {
            this.tintedBuffer.width = canvas.width;
            this.tintedBuffer.height = canvas.height;
        }
        const tintedContext = this.tintedBuffer.getContext('2d');
        tintedContext.clearRect(0, 0, canvas.width, canvas.height);

        // Composite back accessory into buffer.
        if (backAccessory instanceof HTMLImageElement)
        {
            compositedContext.drawImage(backAccessory, 0, 0, canvas.width, canvas.height);
        }
    
        // Draw tinted left tread   
        tintedContext.globalCompositeOperation = "copy";
        if (treadColour instanceof HTMLImageElement)
        {
            tintedContext.drawImage(treadColour, 0, 0, canvas.width, canvas.height);
        }
        else
        {
            tintedContext.fillStyle = treadColour;
            tintedContext.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        tintedContext.globalCompositeOperation = "destination-atop";
        tintedContext.drawImage(leftTread, 0, 0, canvas.width, canvas.height);
    
        // Composite into buffer.
        compositedContext.drawImage(this.tintedBuffer, 0, 0);
        compositedContext.drawImage(leftTreadShade, 0, 0, canvas.width, canvas.height);

        // Draw tinted turret.   
        tintedContext.globalCompositeOperation = "copy";
        if (turretColour instanceof HTMLImageElement)
        {
            tintedContext.drawImage(turretColour, 0, 0, canvas.width, canvas.height);
        }
        else
        {
            tintedContext.fillStyle = turretColour;
            tintedContext.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        tintedContext.globalCompositeOperation = "destination-atop";
        tintedContext.drawImage(turret, 0, 0, canvas.width, canvas.height);
    
        // Composite into buffer.
        compositedContext.drawImage(this.tintedBuffer, 0, 0);
        compositedContext.drawImage(turretShade, 0, 0, canvas.width, canvas.height);

        // Draw tinted base.   
        tintedContext.globalCompositeOperation = "copy";
        if (baseColour instanceof HTMLImageElement)
        {
            tintedContext.drawImage(baseColour, 0, 0, canvas.width, canvas.height);
        }
        else
        {
            tintedContext.fillStyle = baseColour;
            tintedContext.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        tintedContext.globalCompositeOperation = "destination-atop";
        tintedContext.drawImage(base, 0, 0, canvas.width, canvas.height);
    
        // Composite into buffer.
        compositedContext.drawImage(this.tintedBuffer, 0, 0);
        compositedContext.drawImage(baseShade, 0, 0, canvas.width, canvas.height);

        // Draw tinted right tread.   
        tintedContext.globalCompositeOperation = "copy";
        if (treadColour instanceof HTMLImageElement)
        {
            tintedContext.drawImage(treadColour, 0, 0, canvas.width, canvas.height);
        }
        else
        {
            tintedContext.fillStyle = treadColour;
            tintedContext.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        tintedContext.globalCompositeOperation = "destination-atop";
        tintedContext.drawImage(rightTread, 0, 0, canvas.width, canvas.height);
    
        // Composite into buffer.
        compositedContext.drawImage(this.tintedBuffer, 0, 0);
        compositedContext.drawImage(rightTreadShade, 0, 0, canvas.width, canvas.height);

        // Draw tinted barrel.   
        tintedContext.globalCompositeOperation = "copy";
        if (turretColour instanceof HTMLImageElement)
        {
            tintedContext.drawImage(turretColour, 0, 0, canvas.width, canvas.height);
        }
        else
        {
            tintedContext.fillStyle = turretColour;
            tintedContext.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        tintedContext.globalCompositeOperation = "destination-atop";
        tintedContext.drawImage(barrel, 0, 0, canvas.width, canvas.height);
    
        // Composite into buffer.
        compositedContext.drawImage(this.tintedBuffer, 0, 0);
        compositedContext.drawImage(barrelShade, 0, 0, canvas.width, canvas.height);

        // Composite turret accessory into buffer.
        if (turretAccessory instanceof HTMLImageElement)
        {
            compositedContext.drawImage(turretAccessory, 0, 0, canvas.width, canvas.height);
        }

        // Composite front accessory into buffer.
        if (frontAccessory instanceof HTMLImageElement)
        {
            compositedContext.drawImage(frontAccessory, 0, 0, canvas.width, canvas.height);
        }

        // Composite barrel accessory into buffer.
        if (barrelAccessory instanceof HTMLImageElement)
        {
            compositedContext.drawImage(barrelAccessory, 0, 0, canvas.width, canvas.height);
        }

        // setup offscreen buffer for outline
        if (canvas.width != this.outlineBuffer.width || canvas.height != this.outlineBuffer.height)
        {
            this.outlineBuffer.width = canvas.width;
            this.outlineBuffer.height = canvas.height;
        }
        const outlineContext = this.outlineBuffer.getContext('2d');

        outlineContext.globalCompositeOperation = "copy";
        outlineContext.fillStyle = "rgba(0,0,0, 0.8)";
        outlineContext.fillRect(0, 0, canvas.width, canvas.height);
        
        outlineContext.globalCompositeOperation = "destination-atop";
        outlineContext.drawImage(this.compositedBuffer, 0, 0);
        
        const width = UIConstants.TANK_ICON_OUTLINE_WIDTH;
        const diagWidth = Math.sqrt((width * width) / 2.0);
        
        context.drawImage(this.outlineBuffer, -width, 0);
        context.drawImage(this.outlineBuffer, -diagWidth, -diagWidth);
        context.drawImage(this.outlineBuffer, -diagWidth, diagWidth);
        context.drawImage(this.outlineBuffer, 0, width);
        context.drawImage(this.outlineBuffer, 0, -width);
        context.drawImage(this.outlineBuffer, diagWidth, -diagWidth);
        context.drawImage(this.outlineBuffer, diagWidth, diagWidth);
        context.drawImage(this.outlineBuffer, width, 0);

        context.drawImage(this.compositedBuffer, 0, 0);            
    } 
});
