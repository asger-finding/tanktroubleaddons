import { StoreEvent, get, onStateChange } from '../common/store.js';
import { parseHexColor } from '../utils/mathUtils.js';

let isTintedBullets = false;

/**
 * Set the tined bullets option
 * @param option Are tinted bullets enabled?
 */
const setTintedBullets = option => {
	isTintedBullets = option === true;

	const game = GameManager.getGame();
	if (!game || !game.state.getCurrentState()?.projectileGroup) return;

	const state = game.state.getCurrentState();
	const alive = state.projectileGroup.iterate('alive', true, Phaser.Group.RETURN_ALL);
	for (const projectile of alive) projectile.updateColor(isTintedBullets);
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
precision mediump float;

uniform sampler2D uSampler;
uniform float red;
uniform float green;
uniform float blue;
uniform float enabled;
varying vec2 vTextureCoord;

void main(void) {
    vec4 textureColor = texture2D(uSampler, vTextureCoord);

    vec4 solidColor = vec4(red, green, blue, textureColor.a);

    gl_FragColor = mix(textureColor, vec4(red, green, blue, textureColor.a), enabled) * textureColor.a;
}
`;

UIProjectileImage.prototype.spawn = function(x, y, projectileId, frameName) {
	this.frameName = frameName;
	this.reset(x, y);
	this.projectileId = projectileId;
	this.updateColor(isTintedBullets);
};

UIProjectileImage.prototype.updateColor = function(enabled) {
	if (!this.filters) {
		this.filters = [
			new Phaser.Filter(this.game, {
				red: { type: '1f', value: 0.0 },
				green: { type: '1f', value: 0.0 },
				blue: { type: '1f', value: 0.0 },
				enabled: { type: '1f', value: 0.0 }
			}, solidColorFragShader)
		];
	}

	this.filters[0].uniforms.enabled.value = 0.0;

	const projectileData = this.gameController.getProjectile(this.projectileId);
	if (projectileData && enabled) {
		if (![
			Constants.WEAPON_TYPES.BULLET,
			Constants.WEAPON_TYPES.DOUBLE_BARREL,
			Constants.WEAPON_TYPES.SHOTGUN
		].includes(projectileData.getType())) return;

		Backend.getInstance().getPlayerDetails(result => {
			const [filter] = this.filters;
			if (typeof result === 'object') {
				const turret = result.getTurretColour();
				const { red, green, blue } = parseHexColor(turret.numericValue);

				filter.uniforms.red.value = red / 255;
				filter.uniforms.green.value = green / 255;
				filter.uniforms.blue.value = blue / 255;
				filter.uniforms.enabled.value = 1.0;
			}
		}, () => {}, () => {}, projectileData.getPlayerId(), Caches.getPlayerDetailsCache());
	}
};

export const _isESmodule = true;
