//FIXME See if this can be ported to Classy.
UIScrollerGroup = function(game, itemWidth, itemHeight, snapItems, maxScrollSpeed, spawnFunction, removeFunction, context)
{
    // Call super.
    Phaser.Group.call(this, game, null);
    
    this.itemWidth = itemWidth;
    this.itemHeight = itemHeight;
    this.snapItems = snapItems;
    this.maxScrollSpeed = maxScrollSpeed;
    this.spawnFunction = spawnFunction;
    this.removeFunction = removeFunction;
    this.context = context;
    
    // State.
    this.currentItems = null;
    this.firstVisibleItemIndex = 0;
    this.lastVisibleItemIndex = 0;
    this.delay = 0;
    this.minItemX = 0;
    this.maxItemX = 0;
    this.dragging = false;
    this.scrolling = false;
    this.oldDragX = 0;
    this.dragVelocity = 0;
    this.removeTimeout = null;
    
    // Create left arrow.
    this.leftArrow = this.add(new UIScrollerArrowImage(game, "left", this._scrollRight, this._releaseScroll, this));
    
    // Create right arrow.
    this.rightArrow = this.add(new UIScrollerArrowImage(game, "right", this._scrollLeft, this._releaseScroll, this));
    
    // Create drag zone.
    this.hitZone = this.add(new Phaser.Sprite(game, 0, 0, ''));
    this.hitZone.anchor.setTo(0.5, 0.5);
    this.hitZone.height = this.itemHeight;

    this.game.input.onDown.add(this._onInputDownHandler, this);
    this.game.input.onUp.add(this._onInputUpHandler, this);

    // Disable scroller.
    this.exists = false;
    this.visible = false;
};

UIScrollerGroup.prototype = Object.create(Phaser.Group.prototype);
UIScrollerGroup.prototype.constructor = UIScrollerGroup;

UIScrollerGroup.prototype._onInputDownHandler = function(pointer) {
    if (this.game.input.hitTest(this.hitZone, pointer, new Phaser.Point())) {
        this.dragging = true;
        this.oldDragX = pointer.x;
        this.dragVelocity = 0.0;
    }
};

UIScrollerGroup.prototype._onInputUpHandler = function(pointer) {
    this.dragging = false;

    // Enable touch scrolling.
    this.game.input.touch.preventDefault = false;

    // Enable all items.
    if (this.currentItems) {
        for (let i = 0; i < this.currentItems.length; ++i) {
            this.currentItems[i].enable();
        }
    }
};

UIScrollerGroup.prototype.update = function() {
    if (!this.exists) {
        return;
    }

    // Reset scrolling value. It will be set when arrows call their respective scroll functions.
    this.scrolling = false;

    // Call super.
    Phaser.Group.prototype.update.call(this);
    
    if (this.delay > 0) {
        this.delay -= this.game.time.delta;
        return;
    }
    
    // Update drag and velocity.
    if (this.dragging) {
        // Compute drag velocity.
        const dragDiff = (this.game.input.activePointer.x - this.oldDragX);
        this.dragVelocity = (this.dragVelocity * 3.0 + dragDiff / this.game.time.delta * 0.001) / 4.0;
        
        // Limit drag velocity.
        if (Math.abs(this.dragVelocity) > UIConstants.GARAGE_MAX_DRAG_SPEED) {
            this.dragVelocity = this.dragVelocity / Math.abs(this.dragVelocity) * UIConstants.GARAGE_MAX_DRAG_SPEED;
        }
        
        this.oldDragX = this.game.input.activePointer.x;
        
        // First time we move, disable inputs on visible items.
        if (Math.abs(dragDiff) > 0) {
            // Disable touch scrolling.
            this.game.input.touch.preventDefault = true;

            // Disable all items to prevent them from registering events.
            for (let i = 0; i < this.currentItems.length; ++i) {
                this.currentItems[i].disable();
            }
            
            // Move all items.
            for (let i = 0; i < this.currentItems.length; ++i) {
                this.currentItems[i].position.x += this.dragVelocity * this.game.time.delta / 1000;
            }            
        }
    } else {
        let itemVelocity = this.dragVelocity;
        
        // Snap items to "grid" when not scrolling.
        if (this.snapItems && !this.scrolling) {
            const snapDistanceDiff = (this.minItemX + this.itemWidth / 2) - this.currentItems[this.firstVisibleItemIndex].position.x;
            const snapVelocity = snapDistanceDiff * UIConstants.GARAGE_SNAP_DISTANCE_TO_SPEED_SCALE;
            
            itemVelocity += snapVelocity;
        }

        // Limit item velocity.
        if (Math.abs(itemVelocity) > this.maxScrollSpeed) {
            itemVelocity = itemVelocity / Math.abs(itemVelocity) * this.maxScrollSpeed;
        }
        
        // Move all items with velocity.
        for (let i = 0; i < this.currentItems.length; ++i) {
            this.currentItems[i].position.x += itemVelocity * this.game.time.delta / 1000;
        }
                    
        // Apply drag to velocity.
        this.dragVelocity *= UIConstants.GARAGE_SCROLL_DRAG;
    }
    
    // Update the visible items and release arrow clicks whenever a new item spawns.
    if (this.currentItems[this.firstVisibleItemIndex].position.x < this.minItemX) {
        this.currentItems[this.firstVisibleItemIndex].remove();
        
        if (this.removeFunction) {
            this.removeFunction.call(this.context, this.currentItems[this.firstVisibleItemIndex]);
        }
        
        this.firstVisibleItemIndex = (this.firstVisibleItemIndex + 1) % this.currentItems.length;
        const lastItemX = this.currentItems[this.lastVisibleItemIndex].position.x;
        this.lastVisibleItemIndex = (this.lastVisibleItemIndex + 1) % this.currentItems.length;
        this.currentItems[this.lastVisibleItemIndex].spawn(lastItemX + this.itemWidth, 0, true, 0);

        if (this.spawnFunction) {
            this.spawnFunction.call(this.context, this.currentItems[this.lastVisibleItemIndex]);
        }

        this.rightArrow.releaseClick();
    } else if (this.currentItems[this.lastVisibleItemIndex].position.x > this.maxItemX) {
        this.currentItems[this.lastVisibleItemIndex].remove();

        if (this.removeFunction) {
            this.removeFunction.call(this.context, this.currentItems[this.lastVisibleItemIndex]);
        }

        this.lastVisibleItemIndex = (this.lastVisibleItemIndex - 1 + this.currentItems.length) % this.currentItems.length;
        const firstItemX = this.currentItems[this.firstVisibleItemIndex].position.x;
        this.firstVisibleItemIndex = (this.firstVisibleItemIndex - 1 + this.currentItems.length) % this.currentItems.length;
        this.currentItems[this.firstVisibleItemIndex].spawn(firstItemX - this.itemWidth, 0, true, 0);

        if (this.spawnFunction) {
            this.spawnFunction.call(this.context, this.currentItems[this.firstVisibleItemIndex]);
        }

        this.leftArrow.releaseClick();
    }
};

UIScrollerGroup.prototype.postUpdate = function() {
    if (!this.exists) {
        return;
    }

    // Call super.
    Phaser.Group.prototype.postUpdate.call(this);
};

UIScrollerGroup.prototype.spawn = function(x, y, currentItems, firstVisibleItemIndex, lastVisibleItemIndex, delay) {
    if (this.removeTimeout) {
        clearTimeout(this.removeTimeout);
        this.removeTimeout = null;
    }

    // Revive and place the group.
    this.exists = true;
    this.visible = true;
    this.position.setTo(x,y);
    
    this.currentItems = currentItems;
    this.firstVisibleItemIndex = firstVisibleItemIndex;
    this.lastVisibleItemIndex = lastVisibleItemIndex;
    
    // State
    this.delay = delay;
    
    this.minItemX = this.itemWidth * -(lastVisibleItemIndex - firstVisibleItemIndex + 1) / 2;
    this.maxItemX = this.itemWidth * (lastVisibleItemIndex - firstVisibleItemIndex + 1) / 2;
    
    this.leftArrow.spawn(this.minItemX - UIConstants.GARAGE_BUTTON_SCROLL_OFFSET, 0);
    this.rightArrow.spawn(this.maxItemX + UIConstants.GARAGE_BUTTON_SCROLL_OFFSET, 0);
    
    // Update drag zone size.
    this.hitZone.width = this.itemWidth * (lastVisibleItemIndex - firstVisibleItemIndex + 1);
};

UIScrollerGroup.prototype.disable = function(disableTimeMS) {
    this.delay = disableTimeMS;
};

UIScrollerGroup.prototype._scrollLeft = function() {
    this.scrolling = true;
    this.dragVelocity = -this.maxScrollSpeed;
    // Disable all items to prevent them from registering events.
    for (let i = 0; i < this.currentItems.length; ++i) {
        this.currentItems[i].disable();
    }
};

UIScrollerGroup.prototype._scrollRight = function() {
    this.scrolling = true;
    this.dragVelocity = this.maxScrollSpeed;
    // Disable all items to prevent them from registering events.
    for (let i = 0; i < this.currentItems.length; ++i) {
        this.currentItems[i].disable();
    }
};

UIScrollerGroup.prototype._releaseScroll = function() {
    // Enable all items.
    for (let i = 0; i < this.currentItems.length; ++i) {
        this.currentItems[i].enable();
    }
};

UIScrollerGroup.prototype.remove = function() {
    this.exists = false;

    const self = this;
    this.removeTimeout = setTimeout(function() {
        self.visible = false;
    }, UIConstants.ELEMENT_GLIDE_OUT_TIME);

    this.leftArrow.remove();
    this.rightArrow.remove();
};

UIScrollerGroup.prototype.retire = function() {
    this.exists = false;
    this.visible = false;
    this.leftArrow.retire();
    this.rightArrow.retire();
};
