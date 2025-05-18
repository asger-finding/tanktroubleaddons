// Preload functions

/**
 * Initialize the IndexedDB database and ensure required object stores exist.
 * @returns {Promise<IDBDatabase>} A promise that resolves to the initialized database.
 */
const initDatabase = () => new Promise((resolve, reject) => {
	const request = indexedDB.open('addons', 4);

	/* eslint-disable jsdoc/require-jsdoc */
	request.onupgradeneeded = (event) => {
		const db = event.target.result;

		// Ensure 'chatlogCache' object store exists
		if (!db.objectStoreNames.contains('chatlogCache')) {
			const store = db.createObjectStore('chatlogCache', { keyPath: 'messageId' });

			store.createIndex('created', 'created');
			store.createIndex('messageId', 'messageId');
			store.createIndex('messageIndex', 'messageIndex');
			store.createIndex('senders', 'senders', { multiEntry: true });
			store.createIndex('type', 'type');
		}

		// Ensure 'texturePacks' object store exists
		if (!db.objectStoreNames.contains('texturePacks')) {
			const store = db.createObjectStore('texturePacks', { keyPath: 'name' });
			store.createIndex('hashsum', 'hashsum', { unique: true });
		}

		// For any version upgrade, we clear the embedded texture packs
		// in the assumption that they have been modified
		const { transaction } = event.target;
		const texturePacksStore = transaction.objectStore('texturePacks');

		const texturePackReq = texturePacksStore.openCursor();
		texturePackReq.onsuccess = evt => {
			const cursor = evt.target.result;
			if (cursor) {
				const texturePack = cursor.value;
				if (texturePack.builtin === true) cursor.delete();
				cursor.continue();
			}
		};
		texturePackReq.onerror = () => {
			throw new Error('Error iterating through texture packs:', event.target.error);
		};
	};

	request.onsuccess = (event) => resolve(event.target.result);
	request.onerror = (event) => reject(event.target.error);
	/* eslint-enable jsdoc/require-jsdoc */
});

Object.assign(Addons, {
	/**
	 * Derived from Utils.addImageWithClasses
	 *
	 * Adds an <img> resource loaded from the addons extension, to the target element, adding classes
	 * @param {JQuery} container Parent element
	 * @param {string} classes Item classes
	 * @param {string} src Image source
	 * @returns {JQuery} Parent element
	 */
	addImageWithClasses: (container, classes, src) => {
		const image = $(`<img class='${  classes  }'/>`);

		image.attr('src', Addons.t_url(src));

		// Image is of type PNG, also set responsive image (@2x)
		if (src.endsWith('.png') || src.endsWith('.avif')) {
			const ending = src.split('.').pop();
			const srcset = `${Addons.t_url(`${src.substring(0, src.length - ending.length - 1)  }@2x.${ ending }`)  } 2x`;
			image.attr('srcset', srcset);
		}

		container.append(image);
		return container;
	},

	indexedDB: await initDatabase()
});

/**
 * Load custom images in preload
 */
const gamePreloadStage = Game.UIPreloadState.getMethod('preload');
Game.UIPreloadState.method('preload', function(...args) {
	const result = gamePreloadStage.apply(this, ...args);

	this.load.removeFile('image', 'gameiconplaceholder');
	this.load.image('gameiconplaceholder', Addons.t_url('assets/lobby/game.{{png|avif}}'));

	if (this.game.device.pixelRatio > 1) {
		this.load.image('tankiconplaceholderaddons-small', Addons.t_url('assets/lobby/placeholder-140@2x.{{png|avif}}'));
		this.load.image('tankiconplaceholderaddons-large', Addons.t_url('assets/lobby/placeholder-320@2x.{{png|avif}}'));
		this.load.image('leftarrow', Addons.t_url('assets/lobby/leftArrow@2x.{{png|avif}}'));
		this.load.image('rightarrow', Addons.t_url('assets/lobby/rightArrow@2x.{{png|avif}}'));
	} else {
		this.load.image('tankiconplaceholderaddons-small', Addons.t_url('assets/lobby/placeholder-140.{{png|avif}}'));
		this.load.image('tankiconplaceholderaddons-large', Addons.t_url('assets/lobby/placeholder-320.{{png|avif}}'));
		this.load.image('leftarrow', Addons.t_url('assets/lobby/leftArrow.{{png|avif}}'));
		this.load.image('rightarrow', Addons.t_url('assets/lobby/rightArrow.{{png|avif}}'));
	}

	// Optimization flags should preferably
	// be done in the Boot state, but we might
	// as well recycle this function for this
	const { gl } = this.game.renderer;
	gl.disable(gl.DEPTH_TEST);
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.STENCIL_TEST);
	gl.disable(gl.DITHER);
	gl.disable(gl.POLYGON_OFFSET_FILL);
	gl.disable(gl.SAMPLE_COVERAGE);
	gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
	gl.disable(gl.SCISSOR_TEST);

	return result;
});

/**
 * Custom checkbox JQuery UI widget
 */
$.widget('custom.checkboxtoggle', {
	_create() {
		this.element.addClass('ui-checkbox-toggle-input ui-widget-header')
			.wrap('<label class="ui-checkbox-toggle"></label>')
			.after('<span class="ui-checkbox-toggle-slider"></span>');

		// Set initial state based on checkbox value
		this._updateToggle();

		// Attach click handler to change state
		this._on(this.element, {
			change(event) {
				this._updateToggle();

				const item = {
					value: this.element.prop('checked'),
					disabled: this.element.prop('disabled')
				};
				this._trigger('change', event, { item });
			}
		});
	},

	// Update the switch UI to reflect the checkbox state
	_updateToggle() {
		const isChecked = this.element.prop('checked');
		if (isChecked) this.element.next('.ui-checkbox-toggle-slider').addClass('ui-checkbox-toggle-on');
		else this.element.next('.ui-checkbox-toggle-slider').removeClass('ui-checkbox-toggle-on');
	}
});

/**
 * Custom delete-/select menu JQuery UI widget
 */
$.widget('custom.deleteselectmenu', $.ui.selectmenu, {
	_create() {
		this._super('_create');
		this.menu.addClass('ui-deleteselectmenu');
	},
	_renderItem(ul, item) {
		const li = $('<li>');
		const wrapper = $('<div>', { text: item.label });

		if (item.disabled) li.addClass('ui-state-disabled');

		if (item.element.attr('removable') === 'true') {
			$('<button>-</button>')
				.button()
				.on('mouseup', event => {
					item.element.trigger('remove');
					li.remove();

					event.preventDefault();
				})
				.prependTo(wrapper);
		}

		if (item.element.attr('tooltipster-content')) {
			li.tooltipster({ position: 'right', offsetX: 5 });
			li.tooltipster('content', item.element.attr('tooltipster-content'));
		}

		return li.append(wrapper).appendTo(ul);
	}
});

export const _isESmodule = true;
