import { StoreEvent, get, onStateChange } from '../common/store.js';
import { interceptFunction } from '../utils/gameUtils.js';
import { smoothTransition } from '../utils/mathUtils.js';

/* eslint-disable id-length */

/**
 * Parse a hex color string to an RGB object
 * @param {string} hex Hex color string (e.g. "#ff0000" or "#f00")
 * @returns {{ r: number, g: number, b: number }} RGB color object
 */
const hexToRgb = hex => {
	let str = hex.replace('#', '');
	if (str.length === 3) str = str[0] + str[0] + str[1] + str[1] + str[2] + str[2];
	const num = parseInt(str, 16);
	return { r: num >> 16, g: (num >> 8) & 255, b: num & 255 };
};

/**
 * Convert RGB to HSL
 * @param {{ r: number, g: number, b: number }} color RGB color object
 * @returns {{ h: number, s: number, l: number }} HSL color object
 */
const rgbToHsl = ({ r, g, b }) => {
	const bn = b / 255;
	const gn = g / 255;
	const rn = r / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const lightness = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l: lightness * 100 };
	const delta = max - min;
	const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
	let hue = 0;
	if (max === rn) hue = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
	else if (max === gn) hue = ((bn - rn) / delta + 2) / 6;
	else hue = ((rn - gn) / delta + 4) / 6;
	return { h: hue * 360, s: saturation * 100, l: lightness * 100 };
};

/**
 * Interpolate between two values based on hue position
 * @param {number} lo Low bound
 * @param {number} hi High bound
 * @param {number} frac Hue fraction
 * @returns {number} Interpolated value
 */
const hue2rgb = (lo, hi, frac) => {
	let tf = frac;
	if (frac < 0) tf = frac + 1;
	else if (frac > 1) tf = frac - 1;
	if (tf < 1 / 6) return lo + (hi - lo) * 6 * tf;
	if (tf < 1 / 2) return hi;
	if (tf < 2 / 3) return lo + (hi - lo) * (2 / 3 - tf) * 6;
	return lo;
};

/**
 * Convert HSL to RGB
 * @param {{ h: number, s: number, l: number }} color HSL color object
 * @returns {{ r: number, g: number, b: number }} RGB color object
 */
const hslToRgb = ({ h, s, l }) => {
	const ln = l / 100;
	const sn = s / 100;
	if (sn === 0) { const grey = Math.round(ln * 255); return { r: grey, g: grey, b: grey }; }
	const hi = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
	const lo = 2 * ln - hi;
	const hn = h / 360;
	return {
		r: Math.round(hue2rgb(lo, hi, hn + 1 / 3) * 255),
		g: Math.round(hue2rgb(lo, hi, hn) * 255),
		b: Math.round(hue2rgb(lo, hi, hn - 1 / 3) * 255)
	};
};

/**
 * WCAG relative luminance of an RGB color
 * @param {number[]} rgb [r, g, b] values 0-255
 * @returns {number} Relative luminance value
 */
const relativeLuminance = ([r, g, b]) => {
	const [rn, gn, bn] = [r / 255, g / 255, b / 255].map(
		ch => ch <= 0.03928 ? ch / 12.92 : ((ch + 0.055) / 1.055) ** 2.4
	);
	return 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
};

/**
 * WCAG contrast ratio between two RGB colors
 * @param {number[]} colorA First [r, g, b] color
 * @param {number[]} colorB Second [r, g, b] color
 * @returns {number} Contrast ratio
 */
const rgbContrast = (colorA, colorB) => {
	const lumA = relativeLuminance(colorA);
	const lumB = relativeLuminance(colorB);
	const l1 = Math.max(lumA, lumB);
	const l2 = Math.min(lumA, lumB);
	return (l1 + 0.05) / (l2 + 0.05);
};

/* eslint-enable id-length */

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
		const hsl = rgbToHsl({ r, g, b });
		const adjustment = smoothTransition(score, 1.0, MIN_CONTRAST_SCORE, -20, 0);

		// eslint-disable-next-line id-length
		return hslToRgb({ h: hsl.h, s: hsl.s, l: Math.floor(hsl.l + adjustment) });
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
	const { r, g, b } = adjustColorToMaze(hexToRgb(hex));
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
		this.filters = null;
	}
};

export const _isESmodule = true;
