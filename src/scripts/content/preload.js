
/* eslint-disable max-classes-per-file */
import ProxyHelper from '../utils/proxyHelper.js';

// Preload functions

window.Addons = {
	/**
	 * Create a link to an extension resource
	 * @param {string} url Path to file
	 * @returns Url to concate
	 */
	t_url: url => `${ window.addons.extensionUrl }/${ url }`,

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

const setWidget = (function*() {
	yield () => $.widget('custom.iconselectmenu', $.ui.selectmenu, {
		_renderItem( ul, item ) {
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
		const widgetFunc = setWidget.next();
		if (!widgetFunc.done) widgetFunc.value();
	}

	return result;
});
