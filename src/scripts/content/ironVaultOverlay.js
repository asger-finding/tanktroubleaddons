// import { get, set } from '../common/store.js';

export default class IronVaultOverlay {

	id = 'ironvault';

	content = $(`<div class="content ${ this.id }"></div>`);

	icon = $('<div class="icon"></div>');

	#initialized = false;

	#showing = false;

	get isShowing() {
		return this.#showing;
	}

	set isShowing(showing) {
		this.init();

		this.#showing = showing;
		this.content.toggle(showing);

		return this.#showing;
	}

	constructor(parent) {
		fetch(Addons.t_url('assets/menu/ironvault.svg'))
			.then(result => result.text())
			.then(body => {
				this.icon.html(body);
			});

		parent.bindOverlay(this);
	}

	init() {
		if (this.#initialized) return;

		this.content.css({
			backgroundImage: `url('${ Addons.t_url('/assets/menu/background.svg') }'), linear-gradient(325deg, var(--background-color) 50%, #333333 calc(50% + 1px));`
		});

		this.#initialized = true;
	}

	/**
	 * Create a new content block with options
	 * @param {SectionOptions} sectionOpts Options for the section
	 * @param  {Widget[]} widgets JQuery UI widgets
	 * @returns New section
	 */
	// eslint-disable-next-line complexity
	createSection(sectionOpts, widgets = []) {
		const wrapper = $(`<fieldset id="${ sectionOpts.id }"></fieldset>`);
		const legend = $(`<legend>${ sectionOpts.title }</legend>`);

		if (sectionOpts.requiresReload) legend.append('<span class="requires-reload">*</span>');

		wrapper.append(legend);

		for (const widget of widgets) wrapper.append(widget);

		this.content.append(wrapper);

		return wrapper;
	}

}

export const _isESmodule = true;
