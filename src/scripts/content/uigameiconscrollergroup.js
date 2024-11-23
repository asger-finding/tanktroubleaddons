import { spaceAround } from '../utils/mathUtils.js';

UIConstants.classFields({
	GAME_ICON_SCROLL_SPEED: 10 * devicePixelRatio,
	GAME_ICON_MARGIN_FROM_BORDER: 30 * devicePixelRatio,
	LOBBY_MAX_DRAG_SPEED: 850 * devicePixelRatio,
	LOBBY_SNAP_DISTANCE_TO_SPEED_SCALE: 8,
	LOBBY_SCROLL_DRAG: 0.9,
	LOBBY_BUTTON_SCROLL_OFFSET: 60 * devicePixelRatio,

	NO_GAMES_FONT_SIZE: 48 * devicePixelRatio,
	NO_GAMES_STROKE_WIDTH: 4 * devicePixelRatio,
	NO_GAMES_Y: 200 * devicePixelRatio
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

// eslint-disable-next-line complexity
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
		const scale = Phaser.Easing.Cubic.InOut(scaleFactor);

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

UIGameIconScrollerGroup.prototype.addGameIcon = function(newGameIcon) {
	this._sortIcons();

	this.gameIcons.push(newGameIcon);

	this._disableAndDistributeGameIcons();
};

UIGameIconScrollerGroup.prototype.removeGameIcon = function(gameIcon) {
	this._sortIcons();

	const index = this.gameIcons.indexOf(gameIcon);
	if (index !== -1) this.gameIcons.splice(index, 1);

	this._disableAndDistributeGameIcons();
};

UIGameIconScrollerGroup.prototype._disableAndDistributeGameIcons = function() {
	this._gameIconsListChanged();
	this._calculateIconSpacing(this.gameIcons.length);

	this.scrolling = true;
	this.velocity = 0.0;

	const coordinates = spaceAround(this.game.width, Math.min(this.gameIcons.length, 3));

	Promise.all(this.gameIcons.map((gameIcon, i) => new Promise(resolve => {
		const tween = this.game.add.tween(gameIcon.position).to({
			x: coordinates[i]
		}, 300, Phaser.Easing.Cubic.InOut, true);
		tween.onComplete.add(resolve);
	}))).then(() => { this.scrolling = false; });
};

UIGameIconScrollerGroup.prototype._calculateIconSpacing = function(gameIconCount) {
	// Distribute evenly
	this.iconSpacing = (this.game.width / Math.min(Math.max(gameIconCount, 1), 3));
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
		self.visible = false;
	}, UIConstants.ELEMENT_GLIDE_OUT_TIME);

	this.noGamesText.kill();
	this.leftArrow.remove();
	this.rightArrow.remove();
};

UIGameIconScrollerGroup.prototype.retire = function() {
	this.exists = false;
	this.visible = false;
	this.noGamesText.kill();
	this.leftArrow.retire();
	this.rightArrow.retire();
};
