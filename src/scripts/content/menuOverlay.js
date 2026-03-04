/**
 * Base class for menu overlay panels (Addons, IronVault, etc.)
 */
export default class MenuOverlay {

	icon = $('<div class="menuicon"></div>');

	#initialized = false;

	#showing = false;

	/**
	 * Is the overlay showing?
	 * @returns {boolean} Is showing?
	 */
	get isShowing() {
		return this.#showing;
	}

	/**
	 * Show or hide the menu depending on the setter
	 * @param {boolean} showing Should the menu show?
	 * @returns {boolean} Showing
	 */
	set isShowing(showing) {
		this.init();

		this.#showing = showing;
		this.content.toggle(showing);

		return this.#showing;
	}

	/**
	 * Construct the overlay
	 * @param {string} id Overlay identifier
	 * @param {class} parent Menu class instance
	 * @param {string} iconUrl URL to the SVG icon
	 */
	constructor(id, parent, iconUrl) {
		this.id = id;
		this.content = $(`<div class="content ${ id }"></div>`);

		fetch(iconUrl)
			.then(result => result.text())
			.then(body => {
				this.icon.html(body);
			});

		parent.bindOverlay(this);
	}

	/**
	 * Initialize the overlay content (subclasses should override _init)
	 */
	init() {
		if (this.#initialized) return;
		this._init();
		this.#initialized = true;
	}

	/**
	 * Subclass initialization hook
	 * @abstract
	 */
	_init() {}

	/**
	 * Create a new content block with options
	 * @param {SectionOptions} sectionOpts Options for the section
	 * @param  {Widget[]} widgets JQuery UI widgets
	 * @returns {JQuery} New section
	 */
	createSection(sectionOpts, widgets = []) {
		const wrapper = $(`<fieldset id="${ sectionOpts.id }"></fieldset>`);
		const legend = $(`<legend>${ sectionOpts.title }</legend>`);

		if (sectionOpts.requiresReload) legend.append('<span class="requires-reload">*</span>');

		wrapper.append(legend);

		for (const widget of widgets) wrapper.append(widget);

		this.content.append(wrapper);

		return wrapper;
	}

	/**
	 * Update an error tooltip, auto-clearing after 1.5 seconds
	 * @param {JQuery} element Tooltipstered element
	 * @param {string} content Error content
	 */
	static updateTooltipster(element, content) {
		Utils.updateTooltip(element, content);
		setTimeout(() => Utils.updateTooltip(element, ''), 1_500);
	}

}

export const _isESmodule = true;
