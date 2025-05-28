import { interceptFunction } from '../utils/gameUtils.js';

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
interceptFunction($.widget, 'bridge', (original, ...args) => {
	const result = original(...args);

	const [name] = args;
	if (name === 'iconselectmenu') {
		const widgetFunc = proxyWidget.next();
		if (!widgetFunc.done) widgetFunc.value();
	}

	return result;
});

/**
 * Phaser upgrade patches
 */
(() => {
	if (Phaser.VERSION === '2.6.2') return;

	// Reintroduce missing time variables for Phaser CE >= 2.17.0
	Reflect.defineProperty(Phaser.Time.prototype, 'physicsElapsed', {
		get() {
			return this.delta / 1000;
		},
		set(value) {
			this.delta = value * 1000;
		}
	});

	Reflect.defineProperty(Phaser.Time.prototype, 'physicsElapsedMS', {
		get() {
			return this.delta;
		},
		set(value) {
			this.delta = value;
		}
	});

	/* eslint-disable */
	// https://github.com/phaserjs/phaser-ce/commit/52a89aaa09170bcc8a46b495a650bedb9ce76cc4
	// This bug fix breaks functionality for UIAimerGraphics. We restore original function.
	Phaser.Point.multiplyAdd = function(a, b, s, out) {
		if (out === undefined) { out = new Phaser.Point(); }

		return out.setTo(a.x + b.x * s, a.y + b.y * s);
	};
	/* eslint-enable */

	// There is a bug in Phaser CE <2.8.2 which fails flipX for a Phaser Spine
	// This is fixed after, but means that Laika will be "wrongly" (but as intended) flipped.
	// We reverse the flip.
	interceptFunction(UITankAvatarGroup.prototype, 'spawn', function(original, ...args) {
		const result = original(...args);
		if (this.avatarSpine) this.avatarSpine.skeleton.flipX = false;
		return result;
	});
})();

export const _isESmodule = true;
