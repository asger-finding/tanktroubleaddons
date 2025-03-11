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

export const _isESmodule = true;
