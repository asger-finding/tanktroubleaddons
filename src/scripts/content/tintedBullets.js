import { StoreEvent, get, onStateChange } from '../common/store.js';
import { colord } from '@pixi/colord';
import { interceptFunction } from '../utils/gameUtils.js';
import { rgb as rgbContrast } from 'wcag-contrast';
import { smoothTransition } from '../utils/mathUtils.js';

// Constants
/* eslint-disable @typescript-eslint/naming-convention */
const MIN_CONTRAST_SCORE = 8.0;
const MAZE_BACKGROUND = [228, 230, 232];
const FILTER_RESOLUTION = 16;
const APPLICABLE_WEAPON_TYPES = new Set([
	Constants.WEAPON_TYPES.BULLET,
	Constants.WEAPON_TYPES.DOUBLE_BARREL,
	Constants.WEAPON_TYPES.SHOTGUN,
	Constants.WEAPON_TYPES.GATLING_GUN
]);
/* eslint-enable @typescript-eslint/naming-convention */

// State
let shouldBulletsTint = false;

/**
 * Set the tinted bullets option
 * @param option Are tinted bullets enabled?
 */
const setTintedBullets = option => {
	shouldBulletsTint = option === true;

	const game = GameManager.getGame();
	if (!game || !game.state.getCurrentState()?.projectileGroup) return;

	const state = game.state.getCurrentState();
	const alive = state.projectileGroup.iterate('alive', true, Phaser.Group.RETURN_ALL);
	for (const projectile of alive) projectile.updateColor?.(shouldBulletsTint);
};

// Initialize tintedBullets setting
get('tintedBullets').then(setTintedBullets);

// Handle state changes
onStateChange(({ detail }) => {
	if (
		detail?.type === StoreEvent.STORE_CHANGE &&
		typeof detail.data?.curr?.tintedBullets !== 'undefined'
	) setTintedBullets(detail.data.curr.tintedBullets);
});

const solidColorFragShader = `
precision lowp float;

uniform sampler2D uSampler;
uniform vec3 color;
uniform float enabled;
varying vec2 vTextureCoord;

void main(void) {
    vec4 textureColor = texture2D(uSampler, vTextureCoord);
    float alpha = textureColor.a;

    // Use mix to avoid conditional branching
    vec3 blendedColor = mix(textureColor.rgb, color * alpha, enabled * step(0.0, alpha));
    gl_FragColor = vec4(blendedColor, textureColor.a);
}
`;

/**
 * If a projectile is hard to read on a maze (proj. color on #e4e6e8)
 * then darken its color
 * @param {object} rgb RGB color channel {red: number, green: number, blue: number}
 * @param {number} rgb.r Red channel [0..255]
 * @param {number} rgb.g Green channel [0..255]
 * @param {number} rgb.b Blue channel [0..255]
 * @returns {object} Hard to see?
 */
const adjustColorToMaze = ({ r, g, b }) => {
	const score = rgbContrast([r, g, b], MAZE_BACKGROUND);
	if (score < MIN_CONTRAST_SCORE) {
		// Make adjustments to darken the color
		const hsl = colord({ r, g, b }).toHsl();
		const adjustment = smoothTransition(score, 1.0, MIN_CONTRAST_SCORE, -20, 0);

		// eslint-disable-next-line id-length
		return colord({ h: hsl.h, s: hsl.s, l: Math.floor(hsl.l + adjustment) }).toRgb();
	}

	return { r, g, b };
};

/**
 * Create a new filter by its color
 * @param {Phaser.Game} game Phaser game instance
 * @param {string} hex Hex color
 * @returns {Phaser.Filter} New or existing phaser filter
 */
const instanceNewProjectileFilter = (game, hex) => {
	game.filters ??= new Map();

	const cached = game.filters.get(hex);
	if (typeof cached !== 'undefined') return cached;

	// Add new filter for the color
	const { r, g, b } = adjustColorToMaze(colord(hex).toRgb());
	const filter = new Phaser.Filter(game, {
		color: { type: '3fv', value: [r / 255, g / 255, b / 255] },
		enabled: { type: '1f', value: 0.0 }
	}, solidColorFragShader);
	filter.setResolution(FILTER_RESOLUTION, FILTER_RESOLUTION);

	game.filters.set(hex, filter);

	return filter;
};

interceptFunction(UIProjectileImage.prototype, 'spawn', function(original, ...args) {
	const result = original(...args);
	this.updateColor(shouldBulletsTint);
	return result;
});

UIProjectileImage.prototype.updateColor = function(enabled) {
	const projectileData = this.gameController.getProjectile(this.projectileId);
	if (projectileData && enabled) {
		if (!APPLICABLE_WEAPON_TYPES.has(projectileData.getType())) return;

		Backend.getInstance().getPlayerDetails(result => {
			if (typeof result === 'object') {
				const turret = result.getTurretColour();
				const hex = turret.numericValue.replace('0x', '#');

				this.colorFilter = instanceNewProjectileFilter(this.game, hex);
				this.filters = [this.colorFilter];

				this.colorFilter.uniforms.enabled.value = 1.0;
			}
		}, () => {}, () => {}, projectileData.getPlayerId(), Caches.getPlayerDetailsCache());
	} else if (this.colorFilter) {
		this.colorFilter.uniforms.enabled.value = 0.0;
	}
};

export const _isESmodule = true;
