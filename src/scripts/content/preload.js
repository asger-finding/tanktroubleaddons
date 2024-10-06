
/* eslint-disable max-classes-per-file */
import ProxyHelper from '../utils/proxyHelper.js';

// Preload functions

const Addons = {
	/**
	 * Create a link to an extension resource
	 * @param {string} url Path to file
	 * @returns Url to concate
	 */
	t_url: url => window.meta + url,

	/**
	 * Derived from Utils.addImageWithClasses
	 *
	 * Adds an <img> resource loaded from the addons extension, to the target element, adding classes
	 * @param {JQuery} container Parent element
	 * @param {string} classes Item classes
	 * @param {string} src Image source
	 * @returns Parent element
	 */
	addImageWithClasses: (container, classes, src) => {
		const image = $(`<img class='${  classes  }'/>`);

		image.attr('src', t_url(src));

		// Image is of type PNG, also set responsive image (@2x)
		if (src.endsWith('.png')) {
			const srcset = `${t_url(`${src.substring(0, src.length - 4)  }@2x.png`)  } 2x`;
			image.attr('srcset', srcset);
		}

		container.append(image);
		return container;
	},

	menu: new
	/** TankTroubleAddons menu element. Accessible through own player menu */
	class {
		wrapper = $(`<div id="addons-menu"></div>`);

		body = $('<div class="body">');

		draggable = $('<div style="display: contents; cursor: move;"></div>');

		handle = $('<div style="display: contents; cursor: se-resize;"></div>');

		content = $('<div class="content"></div>');

		#matrixTransform = {
			d1: 0,
			d2: 0,
			multiplier: 0
		};

		/**
		 * Get the matrix transform
		 * @returns Matrix transform values
		 */
		get matrixTransform() {
			return this.#matrixTransform;
		}

		/**
		 * Set new matrix transform values and apply transform
		 * @param {object} newValue Object containing new values
		 * @param {number} newValue.d1 First 3DMatrix distortion value
		 * @param {number} newValue.d2 Second 3DMatrix distortion value
		 * @param {number} newValue.multiplier For easing animation
		 */
		set matrixTransform({
			d1 = this.#matrixTransform.d1,
			d2 = this.#matrixTransform.d2,
			multiplier = this.#matrixTransform.multiplier
		}) {
			this.#matrixTransform = { d1, d2, multiplier };

			this.body.css('transform', `matrix3d(1, 0, 0, ${ d1 * multiplier }, 0, 1, 0, ${ d2 * multiplier }, 0, 0, 1, 0, 0, 0, 0, 1);`);

			return this.#matrixTransform;
		}

		isShowing = false;

		/** Construct and initialize the overlay */
		constructor() {
			this.body.append([this.draggable, this.handle, this.content]);

			const border = [
				'borderTopRightBottom',
				'borderRight',
				'borderBottom',
				'borderBottomLeft',
				'borderLeft',
				'borderTopLeftBottom'
			];
			const draggable = [
				'borderTop',
				'borderTopRightLeft',
				'borderTopRight',
				'borderTopLeft',
				'borderTopLeftRight'
			];
			const handle = [
				'borderBottomRight'
			];

			// Instantate border images
			for (const name of [...border, ...draggable, ...handle]) {
				console.log(this, Addons);
				const image = Addons.addImageWithClasses(
					$(`<div class="grid-item" style="grid-area: ${name};">`),
					'',
					name
				);
				image.attr('draggable', 'false');

				if (draggable.includes(name)) this.draggable.append(image);
				else if (handle.includes(name)) this.handle.append(image);
				else this.body.append(image);
			}

			this.draggable.draggable({
				scroll: false,
				addClasses: false,

				/** Make overlay transparent */
				start: () => {
					this.wrapper.css('opacity', 0.7);

					const self = this;
					$(this.matrixTransform).animate({ multiplier: 1 }, {
						duration: 300,

						step() {
							self.matrixTransform = { multiplier: this.multiplier };
						}
					});
				},

				/** Reset overlay opacity, animate out matrix transform */
				stop: () => {
					this.wrapper.css('opacity', '');

					const self = this;
					$(this.matrixTransform).animate({ multiplier: 0 }, {
						duration: 120,

						step() {
							self.matrixTransform = { multiplier: this.multiplier };
						}
					});
				},

				/**
				 * Translate the entire overlay on drag
				 * @param {JQuery.Event} _evt jQuery event'
				 * @param {JQuery.DragEvent} ui jQuery helper object
				 * @param {JQuery.Coordinates} ui.position Element position on page
				 */
				drag: (_evt, { position }) => {
					const centerX = position.left + (this.body.width() / 2);
					const centerY = position.top + (this.body.height() / 2);

					const [d1, d2] = this.#calculate3DDistort(centerX, centerY);

					this.matrixTransform = { d1, d2 };

					this.wrapper.css({
						left: Math.max(20, Math.min(position.left, window.innerWidth - 20 - this.wrapper.width())),
						top: Math.max(20, Math.min(position.top, window.innerHeight - 40))
					});
				}
			});

			this.body.resizable({
				ghost: false,
				handles: { se: this.handle },
				distance: 0,

				minWidth: 300,
				maxWidth: 800,
				minHeight: 130,
				maxHeight: 500
			});

			this.body.css({
				width: 400,
				height: 300
			});

			this.draggable.on('dblclick', () => this.hide(true));

			this.wrapper.append(this.body);

			this.hide(false);
		}

		/**
		 * Calculate a perspective distortion value based on a pixel positon in the window
		 * @param {number} x x-position
		 * @param {number} y y-position
		 * @returns d1 and d2 values for a matrix3d() css function
		 */
		// eslint-disable-next-line class-methods-use-this
		#calculate3DDistort(x, y) {
			const halfWidth = window.innerWidth / 2;
			const halfHeight = window.innerHeight / 2;

			const diffX = (x - halfWidth) / window.innerWidth;
			const diffY = (y - halfHeight) / window.innerHeight;

			const distFromCenter = Math.sqrt(((halfWidth - x) ** 2) + ((halfHeight - y) ** 2));
			const clamped = distFromCenter / Math.sqrt((halfWidth ** 2) + (halfHeight ** 2));

			const d1 = (diffX * clamped) * -.003;
			const d2 = (diffY * clamped) * -.003;

			return [d1, d2];
		}

		/**
		 * Toggle the overlay
		 * @param {boolean} animate Should the sequence animate?
		 */
		toggle(animate) {
			if (this.isShowing) this.hide(animate);
			else this.show(animate);
		}

		/**
		 * Show the overlay
		 * @param {boolean} animate Should the open sequence animate?
		 */
		show(animate = true) {
			if (animate) {
				this.body.css('display', 'grid').addClass('open');
				setTimeout(() => this.body.removeClass('open'), 1_000);
			} else {
				this.body.css({ display: 'grid' });
			}

			this.isShowing = true;
		}

		/**
		 * Hide the overlay
		 * @param {boolean} animate Should the close sequence animate?
		 */
		hide(animate = true) {
			if (animate) {
				this.body.addClass('close');
				setTimeout(() => this.body.removeClass('close').css('display', 'none'), 1_000);
			} else {
				this.body.css({ display: 'none' });
			}

			this.isShowing = false;
		}
	},

	/**
	 * Store object for TankTroubleAddons.
	 *
	 * TODO: IPC to content script
	 * TODO: Events on change
	 * TODO: Interactions with menu
	 */
	store: class {

	}
};

ProxyHelper.interceptFunction(TankTrouble.TankInfoBox, '_initialize', (original, ...args) => {
	original(...args);

	const container = TankTrouble.TankInfoBox.infoAddons = $("<div class='button' title=''/>");
	const standard = Addons.addImageWithClasses(container, 'standard', 'menu.png');
	const active = Addons.addImageWithClasses(container, 'active', 'menuActive.png');

	container.tooltipster({
		position: 'right',
		offsetX: 5
	});

	$(standard).add(active)
		.attr('draggable', 'false')
		.css({
			width: '52px',
			height: '52px'
		});

	container.on('mouseup', () => {
		if (TankTrouble.TankInfoBox.showing) {
			TankTrouble.TankInfoBox.hide();
			overlay.toggle();
		}
	});

	container.append([standard, active]);

	container.insertAfter(TankTrouble.TankInfoBox.infoAchievements);
});

ProxyHelper.interceptFunction(TankTrouble.TankInfoBox, 'show', (original, ...args) => {
	original(...args);

	const [,, playerId] = args;

	TankTrouble.TankInfoBox.infoAddons.toggle(Users.getAllPlayerIds().includes(playerId));
	TankTrouble.TankInfoBox.infoAddons.tooltipster('content', 'Ouroboros');
});

ProxyHelper.whenContentInitialized().then(() => Addons.menu.wrapper.appendTo(document.body));
