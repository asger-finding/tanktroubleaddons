import { spaceAround } from '../utils/mathUtils.js';

/**
 * Create a new game icon scroller.
 * @param {Phaser.Game} game Phaser game instance
 * @param {number} itemWidth Game icon width
 * @param {number} itemHeight Game icon height
 * @param {number} maxScrollSpeed Scroll speed
 */
export default function UIGameIconScrollerGroup(game, itemWidth, itemHeight, maxScrollSpeed) {
	// Call super.
	Phaser.Group.call(this, game, null);

	this.itemWidth = itemWidth;
	this.itemHeight = itemHeight;
	this.maxScrollSpeed = maxScrollSpeed;

	// State.
	this.leftMargin = 0.0;
	this.iconSpacing = 0.0;
	this.gameIcons = [];
	this.unresolvedGameIcons = new Map();
	this.scrolling = false;
	this.velocity = 0.0;
	this.removeTimeout = null;

	// Create left arrow.
	this.leftArrow = this.add(new UIScrollerArrowImage(game, 'left', this._scrollLeft, this._releaseScroll, this));

	// Create right arrow.
	this.rightArrow = this.add(new UIScrollerArrowImage(game, 'right', this._scrollRight, this._releaseScroll, this));

	// Create no games text.
	this.noGamesText = this.game.add.text(0, UIConstants.NO_GAMES_Y, 'No games (╯°□°）╯︵ ┻━┻', {
		font: `${ UIConstants.NO_GAMES_FONT_SIZE }px Arial`,
		fontWeight: 'bold',
		fill: '#000000',
		stroke: '#ffffff',
		strokeThickness: UIConstants.NO_GAMES_STROKE_WIDTH
	});
	this.noGamesText.anchor.setTo(0.5, 0.5);
	this.noGamesText.scale.set(UIConstants.ASSET_SCALE);
	this.noGamesText.position.set(this.game.width / 2.0, UIConstants.NO_GAMES_Y);

	// Disable scroller.
	this.exists = false;
	this.visible = false;
	this.noGamesText.kill();
}

UIGameIconScrollerGroup.prototype = Object.create(Phaser.Group.prototype);
UIGameIconScrollerGroup.prototype.constructor = UIGameIconScrollerGroup;

UIGameIconScrollerGroup.prototype.update = function() {
	if (!this.exists) return;

	Phaser.Group.prototype.update.call(this);

	for (const item of this.gameIcons) item.position.x += this.velocity;

	if (!this.scrolling && this.gameIcons.length > 0) {
		// Find the nearest grid-aligned offset using the first visible icon
		const referenceIcon = this.gameIcons.find(({ x }) => x > 0 && x < this.game.width) ?? this.gameIcons.at(0);
		const currentOffset = referenceIcon.x - this.leftMargin;
		const nearestSlot = Math.round(currentOffset / this.iconSpacing);
		const snapTarget = this.leftMargin + nearestSlot * this.iconSpacing;
		const gridDistanceDiff = snapTarget - referenceIcon.x;

		let snapVelocity = gridDistanceDiff / 3;
		snapVelocity = Math.min(Math.abs(snapVelocity), this.maxScrollSpeed) * Math.sign(snapVelocity);

		for (const item of this.gameIcons) item.position.x += snapVelocity;
	}

	// Apply drag to velocity
	this.velocity *= UIConstants.LOBBY_SCROLL_DRAG;

	this._sortIcons();

	for (const gameIcon of this.gameIcons) {
		const distFromLeft = gameIcon.x;
		const distFromRight = this.game.width - gameIcon.x;
		const nearest = Math.min(distFromLeft, distFromRight);

		const scaleMaxDistance = this.iconSpacing / 2;
		const scaleFactor = Math.max(Math.min((nearest - UIConstants.GAME_ICON_MARGIN_FROM_BORDER) / scaleMaxDistance, 1), 0);
		// eslint-disable-next-line new-cap
		const scale = Phaser.Easing.Cubic.InOut(scaleFactor) * UIConstants.ASSET_SCALE;

		// Hide icons that are just spawning in
		gameIcon.visible = !(gameIcon.x === 0 || gameIcon.x === this.game.width);

		// Scale icons if they are near the edge
		const isTweening = this.game.tweens.isTweening(gameIcon.scale);
		if (!isNaN(scale) && !isTweening) gameIcon.scale.set(scale);
	}

	// Carousel wrap: when an icon passes half a spacing beyond the viewport edge,
	// wrap it to the opposite side of the ring
	if (this.velocity > 0) {
		const rightmost = this.gameIcons.at(-1);
		if (rightmost.x > this.game.width + this.iconSpacing / 2) {
			const leftmost = this.gameIcons.at(0);
			rightmost.position.x = leftmost.x - this.iconSpacing;

			this.leftArrow.releaseClick();
		}
	} else if (this.velocity < 0) {
		const leftmost = this.gameIcons.at(0);
		if (leftmost.x < -this.iconSpacing / 2) {
			const rightmost = this.gameIcons.at(-1);
			leftmost.position.x = rightmost.x + this.iconSpacing;

			this.rightArrow.releaseClick();
		}
	}
};

UIGameIconScrollerGroup.prototype.postUpdate = function() {
	if (!this.exists) return;

	// Call super.
	Phaser.Group.prototype.postUpdate.call(this);
};

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

	this.leftArrow.spawn(this.itemWidth / 2 - UIConstants.LOBBY_BUTTON_SCROLL_OFFSET, 0);
	this.rightArrow.spawn(this.game.width - this.itemWidth / 2 + UIConstants.LOBBY_BUTTON_SCROLL_OFFSET, 0);

	this._gameIconsListChanged();
};

UIGameIconScrollerGroup.prototype.enqueueGameIcon = function(newGameIcon, spawnParameters) {
	this._sortIcons();
	this.unresolvedGameIcons.set(newGameIcon, spawnParameters);

	newGameIcon.exists = true;

	this._calculateIconSpacing(this.gameIcons.length ? this.gameIcons.length + 1 : this.unresolvedGameIcons.size);
};

UIGameIconScrollerGroup.prototype.spawnGameIcon = function(gameIcon) {
	if (this.gameIcons.includes(gameIcon)) return;

	this._sortIcons();

	const spawnParameters = this.unresolvedGameIcons.get(gameIcon) ?? [];

	// Spawn excess icons at x=0 (hidden by visibility check), visible ones at grid positions
	const x = this.gameIcons.length < 3
		? this.leftMargin + this.iconSpacing * this.gameIcons.length
		: 0;
	const y = UIConstants.GAME_ICON_Y;
	gameIcon.spawn(x, y, ...spawnParameters);

	this.unresolvedGameIcons.delete(gameIcon);

	this.gameIcons.push(gameIcon);

	this._distributeGameIcons();
};

UIGameIconScrollerGroup.prototype.removeGameIcon = function(gameIcon) {
	this._sortIcons();

	const index = this.gameIcons.indexOf(gameIcon);
	if (index !== -1) this.gameIcons.splice(index, 1);

	this._calculateIconSpacing(this.gameIcons.length);
	this._distributeGameIcons();
};

UIGameIconScrollerGroup.prototype.onSizeChangeHandler = function() {
	this._sortIcons();
	this._calculateIconSpacing(this.gameIcons.length);

	const iconsBefore = this.gameIcons.filter(({ x }) => x < 0).length;
	this.gameIcons.forEach((gameIcon, i) => {
		gameIcon.x = this.leftMargin + this.iconSpacing * (i - iconsBefore);
	});

	this.noGamesText.position.set(this.game.width / 2.0, UIConstants.NO_GAMES_Y);

	this.leftArrow.x = this.itemWidth / 2 - UIConstants.LOBBY_BUTTON_SCROLL_OFFSET;
	this.rightArrow.x = this.game.width - this.itemWidth / 2 + UIConstants.LOBBY_BUTTON_SCROLL_OFFSET;
};

UIGameIconScrollerGroup.prototype._distributeGameIcons = function() {
	this._gameIconsListChanged();

	// Disable game icons
	// Re-enable once
	// all tweens resolve
	this.scrolling = true;
	this.velocity = 0.0;

	const visibleCount = Math.min(this.gameIcons.length, 3);
	const tweens = [];

	this.gameIcons.forEach((gameIcon, i) => {
		if (i < visibleCount) {
			// Tween visible icons to their grid positions
			const x = this.leftMargin + this.iconSpacing * i;
			tweens.push(new Promise(resolve => {
				const tween = this.game.add.tween(gameIcon.position).to({ x }, 300, Phaser.Easing.Cubic.InOut, true);
				tween.onComplete.add(() => resolve(), {});
			}));
		} else {
			// Place excess icons behind the visible area (left of viewport)
			gameIcon.position.x = this.leftMargin - this.iconSpacing * (i - visibleCount + 1);
		}
	});

	Promise.all(tweens).then(() => { this.scrolling = false; });
};

UIGameIconScrollerGroup.prototype._calculateIconSpacing = function(count) {
	const { leftMargin, spacing } = spaceAround(this.game.width, Math.min(count, 3));

	this.leftMargin = leftMargin;
	this.iconSpacing = spacing;
};

UIGameIconScrollerGroup.prototype._gameIconsListChanged = function() {
	const noGames = this.gameIcons.length === 0;
	if (noGames) this.noGamesText.revive();
	else this.noGamesText.kill();

	const arrowsVisible = this.gameIcons.length > 3;
	this.leftArrow.visible = arrowsVisible;
	this.rightArrow.visible = arrowsVisible;
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
		this.noGamesText.kill();
		this.leftArrow.remove();
		this.rightArrow.remove();

		self.visible = false;
	}, UIConstants.ELEMENT_GLIDE_OUT_TIME);
};

UIGameIconScrollerGroup.prototype.retire = function() {
	this.exists = false;
	this.visible = false;
	this.noGamesText.kill();
	this.leftArrow.remove();
	this.rightArrow.remove();
};

export const _isESmodule = true;
