UIConstants.classFields({
	LOBBY_MAX_DRAG_SPEED: 850 * devicePixelRatio,
	LOBBY_SNAP_DISTANCE_TO_SPEED_SCALE: 8,
	LOBBY_SCROLL_DRAG: 0.9,
	GAMEICON_SCROLL_SPEED: 10 * devicePixelRatio,
	LOBBY_BUTTON_SCROLL_OFFSET: 60 * devicePixelRatio
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
	this.gameIcons = [];
	this.scrolling = false;
	this.velocity = 0.0;
	this.removeTween = null;
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

	for (const item of this.gameIcons) item.position.x += this.velocity;

	if (!this.scrolling) {
		let { velocity } = this;

		const targetX = this.velocity > 0
			? this.gameIcons.at(0)?.x ?? 0
			: this.gameIcons.findLast(({ position }) => position.x < this.game.width).x ?? this.game.width;

		const gridDistanceDiff = this.velocity > 0
			? (this.gameIconSpacing / 2) - targetX
			: this.game.width - (this.gameIconSpacing / 2) - targetX;

		velocity += gridDistanceDiff / 3;
		velocity = Math.min(Math.abs(velocity), this.maxScrollSpeed) * Math.sign(velocity);

		for (const item of this.gameIcons) item.position.x += velocity;

		if (this.removeTween) this.removeTween.reverse = true;
	}

	// Apply drag to velocity
	this.velocity *= UIConstants.LOBBY_SCROLL_DRAG;

	this._sortIcons();

	// Carousel logic
	if (this.velocity > 0) {
		const firstFromRight = this.gameIcons.at(0);
		if (firstFromRight.x > this.gameIconSpacing) {
			// Insert new at right to fill void
			const newGameIcon = this.gameIcons.at(-1);
			newGameIcon.position.x = 0;

			newGameIcon.scale.set(UIConstants.ASSET_SCALE);
			this.game.add.tween(newGameIcon.scale).from({
				x: 0,
				y: 0
			}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Cubic.InOut, true);

			// Pan out scrolled-out game icon
			const toRemove = this.gameIcons.reduce((acc, obj) =>
				Math.abs(this.game.width - (this.gameIconSpacing / 2) - obj.x) < Math.abs(this.game.width - (this.gameIconSpacing / 2) - acc.x) ? obj : acc
			);
			toRemove.scale.set(0, 0);
			this.removeTween = this.game.add.tween(toRemove.scale).from({
				x: UIConstants.ASSET_SCALE,
				y: UIConstants.ASSET_SCALE
			}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Cubic.InOut, true);

			this.leftArrow.releaseClick();
		}
	} else if (this.velocity < 0) {
		const firstFromLeft = this.gameIcons.findLast(({ position }) => position.x < this.game.width);
		if (firstFromLeft.position.x < this.game.width - this.gameIconSpacing) {
			// Insert new at left to fill void
			const newGameIcon = this.gameIcons.at(0);
			newGameIcon.position.x = this.gameIcons.at(-1).position.x + this.gameIconSpacing;

			newGameIcon.scale.set(UIConstants.ASSET_SCALE);
			this.game.add.tween(newGameIcon.scale).from({
				x: 0,
				y: 0
			}, UIConstants.ELEMENT_POP_IN_TIME, Phaser.Easing.Cubic.InOut, true);

			// Pan out scrolled-out game icon
			const toRemove = this.gameIcons.reduce((acc, obj) =>
				Math.abs((this.gameIconSpacing / 2) - obj.x) < Math.abs((this.gameIconSpacing / 2) - acc.x) ? obj : acc
			);
			toRemove.scale.set(0, 0);
			this.removeTween = this.game.add.tween(toRemove.scale).from({
				x: UIConstants.ASSET_SCALE,
				y: UIConstants.ASSET_SCALE
			}, UIConstants.ELEMENT_GLIDE_OUT_TIME, Phaser.Easing.Cubic.InOut, true);

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
UIGameIconScrollerGroup.prototype.spawn = function(x, y) {
	if (this.removeTimeout) {
		clearTimeout(this.removeTimeout);
		this.removeTimeout = null;
	}

	// Revive and place the group.
	this.exists = true;
	this.visible = true;
	this.position.set(x, y);

	// Reset state.
	this.gameIcons = [];
	this.scrolling = false;
	this.velocity = 0.0;
	this.removeTween = null;

	this.leftArrow.spawn(this.itemWidth / 2 - UIConstants.LOBBY_BUTTON_SCROLL_OFFSET, 0);
	this.rightArrow.spawn(this.game.width - this.itemWidth / 2 + UIConstants.LOBBY_BUTTON_SCROLL_OFFSET, 0);

	this.redistributeGameIcons(0);
};

UIGameIconScrollerGroup.prototype.addGameIcon = function(newGameIcon) {
	this._sortIcons();

	const xPosition = this.gameIcons.length
		? this.gameIcons.at(-1)?.position.x + this.gameIconSpacing
		: this.gameIconSpacing / 2;
	newGameIcon.position.set(xPosition, newGameIcon.position.y);

	this.gameIcons = [...this.gameIcons, newGameIcon];

	this._gameIconsListChanged();
};

UIGameIconScrollerGroup.prototype.removeGameIcon = function(gameIcon) {
	this._sortIcons();

	const index = this.gameIcons.indexOf(gameIcon);
	if (index !== -1) this.gameIcons.splice(index, 1);

	gameIcon.remove();

	if (this.gameIcons.length > 3) {
		// Shift all game icons after to the left to fill the gap
		for (const gameIconAfter of this.gameIcons.slice(index)) {
			gameIconAfter.position.subtract(this.gameIconSpacing, 0);
			this.game.add.tween(gameIconAfter.scale).from({
				x: 0,
				y: 0
			}, 150, Phaser.Easing.Cubic.InOut, true);
		}
	}

	this._gameIconsListChanged();
};

UIGameIconScrollerGroup.prototype.redistributeGameIcons = function(gameIconCount) {
	// Distribute evenly
	this.gameIconSpacing = (this.game.width / Math.min(Math.max(gameIconCount, 1), 3));
};

UIGameIconScrollerGroup.prototype._gameIconsListChanged = function() {
	console.log(this.gameIcons.length);

	const visible = this.gameIcons.length > 3;
	this.leftArrow.visible = visible;
	this.rightArrow.visible = visible;
};

UIGameIconScrollerGroup.prototype._sortIcons = function() {
	// Sort game icons right to left
	this.gameIcons = this.gameIcons.sort((firstItem, secondItem) => firstItem.position.x - secondItem.position.x);
};

UIGameIconScrollerGroup.prototype._scrollLeft = function() {
	this.scrolling = true;
	this.velocity = this.maxScrollSpeed;
};

UIGameIconScrollerGroup.prototype._scrollRight = function() {
	this.scrolling = true;
	this.velocity = -this.maxScrollSpeed;
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
