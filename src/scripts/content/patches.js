import ProxyHelper from '../utils/proxyHelper.js';

/**
 * Patch a sprite that doesn't have a .log bound to it, resulting in a rare game-crashing error
 * @param {string} spriteName Name of the sprite in the DOM
 * @returns {(...args: any) => Function} Function wrapper
 */
const bindLogToSprite = spriteName => {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const Sprite = Reflect.get(window, spriteName);
	if (!Sprite) throw new Error('No sprite in window with name', spriteName);

	/**
	 * @param {...any} args Function arguments
	 * @returns {Function} Constructed function
	 */
	return function(...args) {
		const sprite = new Sprite(...args);

		sprite.log = Log.create(spriteName);

		return sprite;
	};
};

Reflect.set(window, 'UIDiamondSprite', bindLogToSprite('UIDiamondSprite'));
Reflect.set(window, 'UIGoldSprite', bindLogToSprite('UIGoldSprite'));

/**
 * Hook the JQuery UI iconselectmenu widget,
 * since its normal setup is incorrect in the
 * upgraded JQuery UI API.
 */
const proxyWidget = (function*() {
	yield () => $.widget('custom.iconselectmenu', $.ui.selectmenu, {
		_renderItem(ul, item) {
			const li = $('<li>');
			const wrapper = $('<div>', { text: item.label });

			if (item.disabled) li.addClass('ui-state-disabled');

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
		},

		refresh() {
			this._super();

			const selectedItem = this.element.find('option:selected');
			const selectedText = selectedItem.text();
			const selectedDescription = selectedItem.attr('data-description');

			if (selectedDescription) this.buttonItem.text(`${selectedText} ${ selectedDescription }`);
		}
	});
})();

/**
 * Apply widget proxy
 */
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
