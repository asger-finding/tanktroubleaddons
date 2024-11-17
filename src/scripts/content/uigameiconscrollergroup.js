UIConstants.classFields({
	LOBBY_MAX_DRAG_SPEED: 850 * devicePixelRatio,
	LOBBY_SNAP_DISTANCE_TO_SPEED_SCALE: 8,
	LOBBY_SCROLL_DRAG: 0.8,
	GAMEICON_SCROLL_SPEED: 10 * devicePixelRatio,
	LOBBY_BUTTON_SCROLL_OFFSET: 50 * devicePixelRatio
});

/**
 *
 * @param game
 * @param itemWidth
 * @param itemHeight
 * @param maxScrollSpeed
 * @param spawnFunction
 * @param removeFunction
 * @param context
 */
// eslint-disable-next-line max-params
export default function UIGameIconScrollerGroup(game, itemWidth, itemHeight, maxScrollSpeed, spawnFunction, removeFunction, context) {
	// Call super.
	Phaser.Group.call(this, game, null);

	this.itemWidth = itemWidth;
	this.itemHeight = itemHeight;
	this.maxScrollSpeed = maxScrollSpeed;
	this.spawnFunction = spawnFunction;
	this.removeFunction = removeFunction;
	this.context = context;

	// State.
	this.items = [];
	this.minItemX = 0;
	this.maxItemX = 0;
	this.scrolling = false;
	this.dragVelocity = 0.0;
	this.removeTimeout = null;

	// Create left arrow.
	this.leftArrow = this.add(new UIScrollerArrowImage(game, 'left', this._scrollLeft, this._releaseScroll, this));

	// Create right arrow.
	this.rightArrow = this.add(new UIScrollerArrowImage(game, 'right', this._scrollRight, this._releaseScroll, this));

	// Disable scroller.
	this.exists = false;
	this.visible = false;
}

UIGameIconScrollerGroup.prototype = Object.create(Phaser.Group.prototype);
UIGameIconScrollerGroup.prototype.constructor = UIGameIconScrollerGroup;

// eslint-disable-next-line complexity
UIGameIconScrollerGroup.prototype.update = function() {
	if (!this.exists) return;

	Phaser.Group.prototype.update.call(this);

	for (const item of this.items) item.position.x += this.dragVelocity;

	// Sort game icons right to left
	this.items = this.items.sort((firstItem, secondItem) => firstItem.position.x - secondItem.position.x);

	if (!this.scrolling) {
		let velocity = this.dragVelocity;

		const gridDistanceDiff = (this.gameIconSpacing + UIConstants.GAME_ICON_WIDTH) - this.items.at(0).x - this.gameIconSpacing;
		velocity += gridDistanceDiff / 3;

		velocity = Math.min(Math.abs(velocity), this.maxScrollSpeed) * Math.sign(velocity);

		for (const item of this.items) item.position.x += velocity;
	}

	// Apply drag to velocity
	this.dragVelocity *= UIConstants.LOBBY_SCROLL_DRAG;

	// Carousel logic
	if (this.dragVelocity > 0) {
		const firstFromRight = this.items.at(0);
		if (firstFromRight.x > this.gameIconSpacing) {
			// Insert new at right
			const newGameIcon = this.items.at(-1);
			newGameIcon.position.x = 0;

			this.game.add.tween(newGameIcon.scale).from({ x: 0, y: 0 }, 150, Phaser.Easing.Cubic.InOut, true);

			this.leftArrow.releaseClick();
		}
	} else if (this.dragVelocity < 0) {
		const firstFromLeft = this.items.findLast(({ position }) => position.x < this.game.width);
		if (firstFromLeft.position.x < this.game.width - this.gameIconSpacing) {
			// Insert new at left
			const newGameIcon = this.items.at(0);
			newGameIcon.position.x = this.items.at(-1).position.x + this.gameIconSpacing;

			this.game.add.tween(newGameIcon.scale).from({ x: 0, y: 0 }, 150, Phaser.Easing.Cubic.InOut, true);

			this.rightArrow.releaseClick();
		}
	}
};

UIGameIconScrollerGroup.prototype.postUpdate = function() {
	if (!this.exists) return;

	// Call super.
	Phaser.Group.prototype.postUpdate.call(this);
};

// eslint-disable-next-line max-params
UIGameIconScrollerGroup.prototype.spawn = function(x, y, items) {
	if (this.removeTimeout) {
		clearTimeout(this.removeTimeout);
		this.removeTimeout = null;
	}

	// Revive and place the group.
	this.exists = true;
	this.visible = true;
	this.position.setTo(x, y);

	this.gameIconSpacing = (this.game.width / 3);

	// Distribute game icons
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		item.position.setTo(this.gameIconSpacing * i + UIConstants.GAME_ICON_WIDTH, item.position.y);
	}

	this.items = items;

	this.minItemX = this.itemWidth / 2 - (this.gameIconSpacing + UIConstants.GAME_ICON_WIDTH);
	this.maxItemX = this.game.width - this.itemWidth / 2 + (this.gameIconSpacing + UIConstants.GAME_ICON_WIDTH);

	this.leftArrow.spawn(this.itemWidth / 2 - UIConstants.LOBBY_BUTTON_SCROLL_OFFSET, 0);
	this.rightArrow.spawn(this.game.width - this.itemWidth / 2 + UIConstants.LOBBY_BUTTON_SCROLL_OFFSET, 0);
};

UIGameIconScrollerGroup.prototype._scrollLeft = function() {
	this.scrolling = true;
	this.dragVelocity = this.maxScrollSpeed;
};

UIGameIconScrollerGroup.prototype._scrollRight = function() {
	this.scrolling = true;
	this.dragVelocity = -this.maxScrollSpeed;
};

UIGameIconScrollerGroup.prototype._releaseScroll = function() {
	this.scrolling = false;
};

UIGameIconScrollerGroup.prototype.remove = function() {
	this.exists = false;

	const self = this;
	this.removeTimeout = setTimeout(() => {
		self.visible = false;
	}, UIConstants.ELEMENT_GLIDE_OUT_TIME);

	this.leftArrow.remove();
	this.rightArrow.remove();
};

UIGameIconScrollerGroup.prototype.retire = function() {
	this.exists = false;
	this.visible = false;
	this.leftArrow.kill();
	this.rightArrow.kill();
};
