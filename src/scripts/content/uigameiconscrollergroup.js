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

	if (!this.scrolling) {
		let { velocity } = this;

		const targetX = this.velocity > 0
			? this.gameIcons.at(0)?.x ?? 0
			: this.gameIcons.findLast(({ position }) => position.x < this.game.width)?.x ?? this.game.width;

		const gridDistanceDiff = this.velocity > 0
			? (this.iconSpacing / 2) - targetX
			: this.game.width - (this.iconSpacing / 2) - targetX;

		velocity += gridDistanceDiff / 3;
		velocity = Math.min(Math.abs(velocity), this.maxScrollSpeed) * Math.sign(velocity);

		for (const item of this.gameIcons) item.position.x += velocity;
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

	// Carousel logic
	if (this.velocity > 0) {
		const firstFromRight = this.gameIcons.at(0);
		if (firstFromRight.x > this.iconSpacing) {
			// Insert new at right to fill void
			const newGameIcon = this.gameIcons.at(-1);
			newGameIcon.position.x = 0;

			this.leftArrow.releaseClick();
		}
	} else if (this.velocity < 0) {
		const firstFromLeft = this.gameIcons.findLast(({ position }) => position.x < this.game.width);
		if (firstFromLeft.position.x < this.game.width - this.iconSpacing) {
			// Insert new at left to fill void
			const newGameIcon = this.gameIcons.at(0);
			newGameIcon.position.x = this.gameIcons.at(-1).position.x + this.iconSpacing;

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

	const x = this.leftMargin + this.iconSpacing * this.gameIcons.length;
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

	Promise.all(this.gameIcons.map((gameIcon, i) => new Promise(resolve => {
		const x = this.leftMargin + this.iconSpacing * i;
		const tween = this.game.add.tween(gameIcon.position).to({ x }, 300, Phaser.Easing.Cubic.InOut, true);
		tween.onComplete.add(() => resolve(), {});
	}))).then(() => { this.scrolling = false; });
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
