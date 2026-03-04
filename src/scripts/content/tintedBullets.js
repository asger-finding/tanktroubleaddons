import { StoreEvent, get, onStateChange } from '../common/store.js';
import { interceptFunction } from '../utils/gameUtils.js';
import { smoothTransition } from '../utils/mathUtils.js';

/**
 * Parse a hex color string to an RGB object
 * @param {string} hex Hex color string (e.g. "#ff0000" or "#f00")
 * @returns {{ r: number, g: number, b: number }}
 */
const hexToRgb = hex => {
	let h = hex.replace('#', '');
	if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
	const n = parseInt(h, 16);
	return { r: n >> 16, g: (n >> 8) & 255, b: n & 255 };
};

/**
 * Convert RGB to HSL
 * @param {{ r: number, g: number, b: number }} rgb
 * @returns {{ h: number, s: number, l: number }}
 */
const rgbToHsl = ({ r, g, b }) => {
	const rn = r / 255, gn = g / 255, bn = b / 255;
	const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
	const l = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l: l * 100 };
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
	else if (max === gn) h = ((bn - rn) / d + 2) / 6;
	else h = ((rn - gn) / d + 4) / 6;
	return { h: h * 360, s: s * 100, l: l * 100 };
};

/**
 * Convert HSL to RGB
 * @param {{ h: number, s: number, l: number }} hsl
 * @returns {{ r: number, g: number, b: number }}
 */
const hslToRgb = ({ h, s, l }) => {
	const sn = s / 100, ln = l / 100;
	if (sn === 0) { const v = Math.round(ln * 255); return { r: v, g: v, b: v }; }
	const hue2rgb = (p, q, t) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
	const p = 2 * ln - q;
	const hn = h / 360;
	return {
		r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
		g: Math.round(hue2rgb(p, q, hn) * 255),
		b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255)
	};
};

/**
 * WCAG relative luminance of an RGB color
 * @param {number[]} rgb [r, g, b] values 0-255
 * @returns {number} relative luminance
 */
const relativeLuminance = ([r, g, b]) => {
	const [rn, gn, bn] = [r / 255, g / 255, b / 255].map(
		c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
	);
	return 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
};

/**
 * WCAG contrast ratio between two RGB colors
 * @param {number[]} a [r, g, b]
 * @param {number[]} b [r, g, b]
 * @returns {number} contrast ratio
 */
const rgbContrast = (a, b) => {
	const l1 = Math.max(relativeLuminance(a), relativeLuminance(b));
	const l2 = Math.min(relativeLuminance(a), relativeLuminance(b));
	return (l1 + 0.05) / (l2 + 0.05);
};

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
