import ProxyHelper from '../utils/proxyHelper.js';

// Preload functions

/**
 * Initialize the IndexedDB database and ensure required object stores exist.
 * @returns {Promise<IDBDatabase>} A promise that resolves to the initialized database.
 */
const initDatabase = () => new Promise((resolve, reject) => {
	const request = indexedDB.open('addons', 3);

	/* eslint-disable jsdoc/require-jsdoc */
	request.onupgradeneeded = (event) => {
		const db = event.target.result;

		console.log(db.objectStoreNames);

		// Ensure 'chatlogCache' object store exists
		if (!db.objectStoreNames.contains('chatlogCache')) {
			const store = db.createObjectStore(storeName, { keyPath: 'messageId' });

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
	};

	request.onsuccess = (event) => resolve(event.target.result);
	request.onerror = (event) => reject(event.target.error);
	/* eslint-enable jsdoc/require-jsdoc */
});

window.Addons = {
	/**
	 * Create a link to an extension resource
	 * @param {string} url Path to file
	 * @returns Url to concate
	 */
	t_url: url => `${ window.addons.extensionUrl }${ url }`,

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

		image.attr('src', Addons.t_url(src));

		// Image is of type PNG, also set responsive image (@2x)
		if (src.endsWith('.png')) {
			const srcset = `${Addons.t_url(`${src.substring(0, src.length - 4)  }@2x.png`)  } 2x`;
			image.attr('srcset', srcset);
		}

		container.append(image);
		return container;
	},

	indexedDB: await initDatabase()
};

const gamePreloadStage = Game.UIPreloadState.getMethod('preload');
Game.UIPreloadState.method('preload', function(...args) {
	const result = gamePreloadStage.apply(this, ...args);

	GameManager.getGame().load.removeFile('image', 'gameiconplaceholder');
	this.load.image('gameiconplaceholder', Addons.t_url('assets/lobby/game.png'));

	if (this.game.device.pixelRatio > 1) {
		this.load.image('tankiconplaceholderaddons-small', Addons.t_url('assets/lobby/placeholder-140@2x.png'));
		this.load.image('tankiconplaceholderaddons-large', Addons.t_url('assets/lobby/placeholder-320@2x.png'));
		this.load.image('leftarrow', Addons.t_url('assets/lobby/leftArrow@2x.png'));
		this.load.image('rightarrow', Addons.t_url('assets/lobby/rightArrow@2x.png'));
	} else {
		this.load.image('tankiconplaceholderaddons-small', Addons.t_url('assets/lobby/placeholder-140.png'));
		this.load.image('tankiconplaceholderaddons-large', Addons.t_url('assets/lobby/placeholder-320.png'));
		this.load.image('leftarrow', Addons.t_url('assets/lobby/leftArrow.png'));
		this.load.image('rightarrow', Addons.t_url('assets/lobby/rightArrow.png'));
	}

	return result;
});

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

const proxyWidget = (function*() {
	yield () => $.widget('custom.iconselectmenu', $.ui.selectmenu, {
		_renderItem(ul, item) {
			const li = $('<li>');
			const wrapper = $('<div>', { text: item.label });

			if ( item.disabled )li.addClass('ui-state-disabled');

			if (item.element.attr('data-imagesrc')) {
				$(`<div><img width="26" src="${ item.element.attr('data-imagesrc') }" srcset="${ item.element.attr('data-imagesrcset') }"/></div>`)
					.addClass('ui-icon')
					.appendTo(wrapper);
			}

			if (item.element.attr('data-description')) {
				$(`<div style="font-size: 0.7em;">${ item.element.attr('data-description') }</div>`)
					.appendTo(wrapper);
			}

			return li.append(wrapper).appendTo(ul);
		}
	});
})();

ProxyHelper.interceptFunction($.widget, 'bridge', (original, ...args) => {
	const result = original(...args);

	const [name] = args;
	if (name === 'iconselectmenu') {
		const widgetFunc = proxyWidget.next();
		if (!widgetFunc.done) widgetFunc.value();
	}

	return result;
});

export const _isESmodule = true;
