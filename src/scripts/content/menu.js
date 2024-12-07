import AddonsOverlay from './addonsOverlay.js';
import IronVaultOverlay from './ironVaultOverlay.js';
import ProxyHelper from '../utils/proxyHelper.js';

/**
 * @typedef {object} SectionOptions
 * @property {string} title Title for the section
 * @property {string} id Unique id for the section
 * @property {boolean} requiresReload Does the site need to reload for the change to take effect?
 */

/**
 * @typedef {JQuery} Widget
 */

class Menu {
	wrapper = $('<div id="addons-menu"></div>');

	body = $('<div class="body">');

	draggable = $('<div style="display: contents; cursor: move;"></div>');

	icons = $('<div style="display: contents;"></div>');

	handle = $('<div style="display: contents; cursor: se-resize;"></div>');

	header = $('<div class="header"/>');

	currentPage = '';

	addons = null;

	#initialized = false;

	isShowing = false;

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

		// Fix messy antialiasing when mixing svgs
		// and transforms in chrome
		const epsilon = 1.0e-02;
		if (multiplier < epsilon) {
			this.body.css({ transform: '' });

			return this.#matrixTransform;
		}

		this.body.css({ transform: `matrix3d(1, 0, 0, ${ d1 * multiplier }, 0, 1, 0, ${ d2 * multiplier }, 0, 0, 1, 0, 0, 0, 0, 1);` });

		return this.#matrixTransform;
	}

	/** Construct and initialize the overlay */
	constructor() {
		this.header.svg({
			settings: {
				width: 300,
				height: 34
			}
		});
		this.headerSvg = this.header.svg('get');
		const headerText = this.headerSvg.text(1, 22, 'TankTroubleAddons', {
			textAnchor: 'start',
			fontFamily: 'TankTrouble',
			fontSize: 24,
			fontWeight: 'normal',
			fill: 'white',
			stroke: 'black',
			strokeLineJoin: 'round',
			strokeWidth: 4,
			letterSpacing: 1,
			paintOrder: 'stroke'
		});

		const scaleAndTranslate = Utils.getSVGScaleAndTranslateToFit(300, 312, 34, 'left');
		this.headerSvg.configure(headerText, { transform: scaleAndTranslate });

		this.body.append([this.draggable, this.icons, this.handle, this.header]);

		const border = [
			'borderTopRightBottom',
			'borderTopLeftBottom',
			'borderRight',
			'borderBottom',
			'borderBottomLeft'
		];
		const draggable = [
			'borderTop',
			'borderTopRightLeft',
			'borderTopRight',
			'borderTopLeft',
			'borderTopLeftRight'
		];
		const icons = [
			'borderLeft'
		];
		const handle = [
			'borderBottomRight'
		];

		// Instantiate border vectors
		for (const name of [...border, ...draggable, ...icons, ...handle]) {
			fetch(Addons.t_url(`assets/menu/${name}.svg`))
				.then(result => result.text())
				// eslint-disable-next-line @typescript-eslint/no-loop-func
				.then(body => {
					const image = $(`<div class="grid-item" style="grid-area: ${name};">`).append(body);

					if (draggable.includes(name)) this.draggable.append(image);
					else if (icons.includes(name)) this.icons.append(image);
					else if (handle.includes(name)) this.handle.append(image);
					else this.body.append(image);
				});
		}

		this.draggable.draggable({
			scroll: false,
			addClasses: false,

			/** Make overlay transparent */
			start: () => {
				this.wrapper.css({ opacity: 0.7 });

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
				this.wrapper.css({ opacity: '' });

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

			minWidth: 400,
			maxWidth: 400,
			minHeight: 200,
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

	init() {
		if (this.#initialized) return;

		this.addons = new AddonsOverlay(this);
		this.ironvault = new IronVaultOverlay(this);

		this.currentPage = 'addons';
		this.goToCurrentPage();

		this.#initialized = true;
	}

	bindOverlay(overlay) {
		this.body.append(overlay.content);
		this.icons.append(overlay.icon);

		overlay.icon.on('mouseup', () => {
			this.currentPage = overlay.id;
			this.goToCurrentPage();
		});
	}

	goToCurrentPage() {
		this.addons.isShowing = false;
		this.ironvault.isShowing = false;

		this[this.currentPage].isShowing = true;
	}

	/**
	 * Calculate a perspective distortion value based on a pixel positon in the window
	 * @param {number} x x-position
	 * @param {number} y y-position
	 * @returns d1 and d2 values for a matrix3d() css function
	 */
	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/class-methods-use-this
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
		this.init();

		if (this.isShowing) this.hide(animate);
		else this.show(animate);
	}

	/**
	 * Show the overlay
	 * @param {boolean} animate Should the opening sequence animate?
	 */
	show(animate = true) {
		if (animate) {
			this.wrapper.addClass('opening');
			this.wrapper.css({ display: 'block' });
			setTimeout(() => this.wrapper.removeClass('opening'), 1_000);
		} else {
			this.wrapper.css({ display: 'block' });
		}

		this.isShowing = true;
	}

	/**
	 * Hide the overlay
	 * @param {boolean} animate Should the close sequence animate?
	 */
	hide(animate = true) {
		if (animate) {
			this.wrapper.addClass('closing');
			setTimeout(() => this.wrapper.removeClass('closing').css({ display: 'none' }), 1_000);
		} else {
			this.wrapper.css({ display: 'none' });
		}

		this.isShowing = false;
	}

}

Object.assign(Addons, {
	menu: new Menu()
});

ProxyHelper.interceptFunction(TankTrouble.TankInfoBox, '_initialize', (original, ...args) => {
	original(...args);

	const addonsButton = TankTrouble.TankInfoBox.infoAddons = $('<div class="button" title=""/>');
	const standard = Addons.addImageWithClasses(addonsButton, 'standard', 'assets/menu/menu.png');
	const active = Addons.addImageWithClasses(addonsButton, 'active', 'assets/menu/menuActive.png');

	addonsButton.tooltipster({
		position: 'right',
		offsetX: 5
	});

	$(standard).add(active)
		.attr('draggable', 'false')
		.css({
			width: '52px',
			height: '52px'
		});

	addonsButton.on('mouseup', () => {
		if (TankTrouble.TankInfoBox.showing) {
			TankTrouble.TankInfoBox.hide();
			Addons.menu.toggle();
		}
	});

	addonsButton.append([standard, active]);
	addonsButton.insertAfter(TankTrouble.TankInfoBox.infoAchievements);
});

ProxyHelper.interceptFunction(TankTrouble.TankInfoBox, 'show', (original, ...args) => {
	original(...args);

	const [,, playerId] = args;

	TankTrouble.TankInfoBox.infoAddons.toggle(Users.getAllPlayerIds().includes(playerId));
	TankTrouble.TankInfoBox.infoAddons.tooltipster('content', 'TankTroubleAddons');
	Backend.getInstance().getPlayerDetails(result => {
		if (typeof result === 'object') {
			if (result.getGmLevel() !== null) {
				TankTrouble.TankInfoBox.infoAddons.tooltipster('option', 'position', 'left');
				TankTrouble.TankInfoBox.infoAddons.tooltipster('option', 'offsetX', 5);
			} else {
				TankTrouble.TankInfoBox.infoAddons.tooltipster('option', 'position', 'top');
				TankTrouble.TankInfoBox.infoAddons.tooltipster('option', 'offsetX', 0);
			}
		}
	}, () => {}, () => {}, playerId, Caches.getPlayerDetailsCache());
});

ProxyHelper.whenContentInitialized().then(() => Addons.menu.wrapper.appendTo(document.body));

export const _isESmodule = true;
