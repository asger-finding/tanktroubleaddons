import { get, set } from '../common/store.js';

export default class AddonsUI {

	id = 'addons';

	content = $(`<div class="content ${ this.id }"></div>`);

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
	 * Construct the addons content
	 * @param {class} parent Menu class instance
	 */
	constructor(parent) {
		fetch(Addons.t_url('assets/menu/addons/addons.svg'))
			.then(result => result.text())
			.then(body => {
				this.icon.html(body);
			});

		parent.bindOverlay(this);
	}

	/**
	 * Initialize the addons content
	 */
	init() {
		if (this.#initialized) return;

		// Interface options
		(() => {
			const interfaceWidget = $('<div></div>');
			const themeHeading = $('<div class="heading">Theme</div>');
			const themeSelect = $(`
				<label for="radio-1">Normal</label>
				<input type="radio" name="radio-1" id="radio-1" value="normal" data-set-color-scheme="light">
				<label for="radio-2">Dark</label>
				<input type="radio" name="radio-1" id="radio-2" value="dark" data-set-color-scheme="dark">
			`);
			const checkboxWrapper = $('<div style="display: grid; grid-template-areas: \'title-1 title-2\' \'checkbox-1 checkbox-2\'"></div>');
			const classicMouseCheckbox = $(`
				<div class="heading" style="grid-area: title-1">Classic mouse</div>
				<input type="checkbox" style="grid-area: checkbox-1">
			`);
			const tintedBulletsCheckbox = $(`
				<div class="heading" style="grid-area: title-2">Tinted bullets</div>
				<input type="checkbox" style="grid-area: checkbox-2">	
			`);

			checkboxWrapper.append([classicMouseCheckbox, tintedBulletsCheckbox]);
			interfaceWidget.append([themeHeading, themeSelect, '<hr>', checkboxWrapper]);

			get('theme').then(theme => {
				const { classToken } = theme;
				themeSelect.filter(`input[type="radio"][value="${classToken}"]`).prop('checked', true);

				themeSelect.filter('input[type="radio"]')
					.checkboxradio();

				// Attach a change event listener
				themeSelect.filter('input[type="radio"]').on('change', ({ target }) => {
					const $target = $(target);
					if ($target.is(':checked')) {
						const newTheme = $target.val();
						const colorScheme = $target.attr('data-set-color-scheme');
						set('theme', { classToken: newTheme, colorScheme });
					}
				});
			});

			get('classicMouse').then(classicMouse => {
				classicMouseCheckbox.filter('input[type="checkbox"]')
					.prop('checked', classicMouse)
					.checkboxtoggle({
						// eslint-disable-next-line jsdoc/require-jsdoc
						change: (_event, { item }) => set('classicMouse', item.value)
					});
			});
			get('tintedBullets').then(tintedBullets => {
				tintedBulletsCheckbox.filter('input[type="checkbox"]')
					.prop('checked', tintedBullets)
					.checkboxtoggle({
						// eslint-disable-next-line jsdoc/require-jsdoc
						change: (_event, { item }) => set('tintedBullets', item.value)
					});
			});

			this.#createSection({
				title: 'Interface',
				id: 'theme',
				requiresReload: false
			}, [ interfaceWidget ]);
		})();

		// "Other" options
		(() => {
			const otherWidget = $('<div></div>');
			const resourcePackWrapper = $('<div></div>');
			const resourcePackHeading = $('<div class="heading">Resource packs</div>');
			const selectWrapper = $('<div></div>');
			const resourcePackSelect = $('<select></select>');
			const createNewWrapper = $('<div class="create-new-wrapper"></div>');

			const createNewLabel = $('<label for="resourcepackpicker" class="custom-file-upload">Select file</label>');
			const createNewPicker = $('<input type="file" id="resourcepackpicker" accept=".zip" style="display: none;"/>');
			const createNewSubmit = $('<button type="submit">Add</button>');
			createNewLabel.button();
			createNewSubmit.button();

			createNewWrapper.append(['<br>', createNewLabel, createNewPicker, createNewSubmit]);
			selectWrapper.append(resourcePackSelect);

			resourcePackWrapper.append([selectWrapper, createNewWrapper]);

			createNewPicker.on('click', () => createNewPicker.val(''));
			createNewPicker.on('change', async() => {
				const [file] = createNewPicker.prop('files');
				console.log(file);
				createNewLabel.text(file ? file.name : 'Select file');
			});

			createNewSubmit.tooltipster({
				position: 'right',
				theme: 'tooltipster-error',
				offsetX: 5,
				trigger: 'custom'
			});

			/**
			 * Create a new option for the select menu
			 * @param resourcePack Resource pack details
			 * @returns New option element
			 */
			const createNewOption = resourcePack => {
				const option = $('<option></option');
				option.attr('value', resourcePack.hashsum);
				option.attr('removable', !resourcePack.builtin);
				option.html(AddonsUI.#parseFormattedText(resourcePack.metafile.pack.name));
				option.attr('as-html', true);
				option.attr('tooltipster-content', resourcePack.metafile.pack.description);
				option.on('remove', () => {
					Addons.removeResourcePack(resourcePack.hashsum)
						.then(result => {
							resourcePackSelect.val(result === false ? 'new' : result.hashsum);
							resourcePackSelect.deleteselectmenu('refresh');
							createNewWrapper.toggle(!result);
						});
				});

				return option;
			};

			createNewSubmit.on('mouseup', async() => {
				const [file] = createNewPicker.prop('files');
				if (file) {
					Addons.storeResourcePack(file)
						.then(hashsum => Addons.setActiveResourcePack(hashsum)
							.then(resourcePack => {
								AddonsUI.#updateTooltipster(createNewSubmit, '');
								Utils.updateTooltip(createNewSubmit, '');
								Addons.reloadGame();

								const option = createNewOption(resourcePack);

								resourcePackSelect.find('> :last').before(option);
								createNewLabel.text('Select file');
								resourcePackSelect.val(hashsum);
								resourcePackSelect.deleteselectmenu('refresh');

								createNewWrapper.hide();
							}))
						.catch(err => {
							AddonsUI.#updateTooltipster(createNewSubmit, err.message);
						});
				}
			});

			Addons.getAllResourcePacks()
				.then(async resourcePacks => {
					resourcePackSelect.append(resourcePacks.map(resourcePack => createNewOption(resourcePack)));

					const newResourcePackOption = $('<option value="new">Add from zip ...</option>');
					resourcePackSelect.append(newResourcePackOption);

					const selectValue = await Addons.getActiveResourcePack()
						.then(({ hashsum }) => hashsum)
						.catch(() => 'new');
					resourcePackSelect.val(selectValue);
					createNewWrapper.toggle(selectValue === 'new');

					resourcePackSelect.deleteselectmenu({
						appendTo: this.content,

						// eslint-disable-next-line jsdoc/require-jsdoc
						change: (_event, { item }) => {
							if (item.value === 'new') {
								createNewWrapper.show();
							} else {
								createNewWrapper.hide();
								Addons.setActiveResourcePack(item.value);
								Addons.reloadGame();
							}
						}
					});
				});

			otherWidget.append([resourcePackHeading, resourcePackWrapper]);

			this.#createSection({
				title: 'Other',
				id: 'other',
				requiresReload: false
			}, [ otherWidget ]);
		})();

		this.#initialized = true;
	}

	/**
	 * Create a new content block with options
	 * @param {SectionOptions} sectionOpts Options for the section
	 * @param  {Widget[]} widgets JQuery UI widgets
	 * @returns {JQuery} New section
	 */
	// eslint-disable-next-line complexity
	#createSection(sectionOpts, widgets = []) {
		const wrapper = $(`<fieldset id="${ sectionOpts.id }"></fieldset>`);
		const legend = $(`<legend>${ sectionOpts.title }</legend>`);

		if (sectionOpts.requiresReload) legend.append('<span class="requires-reload">*</span>');

		wrapper.append(legend);

		for (const widget of widgets) wrapper.append(widget);

		this.content.append(wrapper);

		return wrapper;
	}

	/**
	 * Update the search button error tooltip
	 * @param {JQuery} element Tooltipstered element
	 * @param {string} content Error content
	 */
	static #updateTooltipster(element, content) {
		Utils.updateTooltip(element, content);
		setTimeout(() => Utils.updateTooltip(element, ''), 1_500);
	}

	/**
	 * Parse text to format with colors and styling
	 * @param {string} input Text input
	 * @returns {string} Formatted html
	 */
	// eslint-disable-next-line complexity
	static #parseFormattedText(input) {
		const codes = {
			// Color codes (0-f) mapped to rainbow-like colors
			'&0': 'color:#000000',
			'&1': 'color:#0000AA',
			'&2': 'color:#00AA00',
			'&3': 'color:#00AAAA',
			'&4': 'color:#AA0000',
			'&5': 'color:#AA00AA',
			'&6': 'color:#FFAA00',
			'&7': 'color:#AAAAAA',
			'&8': 'color:#555555',
			'&9': 'color:#5555FF',
			'&a': 'color:#55FF55',
			'&b': 'color:#55FFFF',
			'&c': 'color:#FF5555',
			'&d': 'color:#FF55FF',
			'&e': 'color:#FFFF55',
			'&f': 'color:#FFFFFF',
			// Style codes
			'&l': 'font-weight:bold',
			'&o': 'font-style:italic',
			'&n': 'text-decoration:underline'
			// &r: reset styling
		};

		// eslint-disable-next-line jsdoc/require-jsdoc
		const escapeHtml = text => {
			const escapeMap = {
				'&': '&',
				'<': '<',
				'>': '>',
				'"': '"',
				"'": '\''
			};
			return text.replace(/[&<>"']/gu, (unsafe) => escapeMap[unsafe]);
		};

		let output = '';
		let activeStyles = [];
		let i = 0;

		while (i < input.length) {
			if (input[i] === '&' && i + 1 < input.length && codes[input.slice(i, i + 2)]) {
				const code = input.slice(i, i + 2);
				if (code === '&r') activeStyles = [];
				else activeStyles.push(codes[code]);

				i += 2;
			} else {
				// Collect text until next '&' or end
				let text = '';
				while (i < input.length && input[i] !== '&') {
					text += input[i];
					i++;
				}
				if (text) {
					const escapedText = escapeHtml(text);
					output += activeStyles.length
						? `<span style="${activeStyles.join(';')}">${escapedText}</span>`
						: escapedText;
				}
			}
		}

		return output;
	}

}

export const _isESmodule = true;
