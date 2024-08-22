/**
 * Patch a sprite that doesn't have a .log bound to it, resulting in a rare game-crashing error
 * @param spriteName Name of the sprite in the DOM
 * @returns Function wrapper
 */
const bindLogToSprite = spriteName => {
	const Sprite = Reflect.get(window, spriteName);
	if (!Sprite) throw new Error('No sprite in window with name', spriteName);

	return function(...args) {
		const sprite = new Sprite(...args);

		sprite.log = Log.create(spriteName);

		return sprite;
	};
};

Reflect.set(window, 'UIDiamondSprite', bindLogToSprite('UIDiamondSprite'));
Reflect.set(window, 'UIGoldSprite', bindLogToSprite('UIGoldSprite'));
