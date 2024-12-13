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
precision lowp float;

uniform sampler2D uSampler;
uniform vec3 color;
uniform float enabled;
varying vec2 vTextureCoord;

void main(void) {
	if (enabled != 1.0) {
		gl_FragColor = texture2D(uSampler, vTextureCoord);;
		return;
	}

    vec4 textureColor = texture2D(uSampler, vTextureCoord);
	float alpha = textureColor.a;
    if (alpha > 0.0) {
        // Un-premultiply alpha and blend directly, then re-premultiply
        textureColor.rgb = mix(textureColor.rgb / alpha, color, enabled) * alpha;
    }

    gl_FragColor = textureColor;
}
`;

const proto = UIProjectileImage.prototype;
UIProjectileImage = function(game, gameController) {
	Phaser.Image.call(this, game, 0, 0, 'game', '');
	this.gameController = gameController;
	this.anchor.setTo(0.5, 0.5);
	this.scale.setTo(UIConstants.GAME_ASSET_SCALE, UIConstants.GAME_ASSET_SCALE);

	this.colorFilter = new Phaser.Filter(this.game, {
		color: { type: '3fv', value: [0.0, 0.0, 0.0] },
		enabled: { type: '1f', value: 0.0 }
	}, solidColorFragShader);
	this.colorFilter.setResolution(16, 16);
	this.filters = [ this.colorFilter ];

	this.kill();
};

UIProjectileImage.prototype = proto;

UIProjectileImage.prototype.spawn = function(x, y, projectileId, frameName) {
	this.frameName = frameName;
	this.reset(x, y);
	this.projectileId = projectileId;
	this.updateColor(isTintedBullets);
};

UIProjectileImage.prototype.updateColor = function(enabled) {
	if (!this.colorFilter) return;

	this.colorFilter.uniforms.enabled.value = 0.0;

	const projectileData = this.gameController.getProjectile(this.projectileId);
	if (projectileData && enabled) {
		if (![
			Constants.WEAPON_TYPES.BULLET,
			Constants.WEAPON_TYPES.DOUBLE_BARREL,
			Constants.WEAPON_TYPES.SHOTGUN
		].includes(projectileData.getType())) return;

		this.colorFilter.uniforms.color.value = [255, 0, 0];
		this.colorFilter.uniforms.enabled.value = 1.0;

		Backend.getInstance().getPlayerDetails(result => {
			if (typeof result === 'object') {
				const turret = result.getTurretColour();
				const { red, green, blue } = parseHexColor(turret.numericValue);

				this.colorFilter.uniforms.color.value = [red / 255, green / 255, blue / 255];
				this.colorFilter.uniforms.enabled.value = 1.0;
			}
		}, () => {}, () => {}, projectileData.getPlayerId(), Caches.getPlayerDetailsCache());
	}
};

export const _isESmodule = true;
