import ProxyHelper from '../utils/proxyHelper.js';

/**
 * Add "minimum" quality constants to quality config
 */
QualityManager.QUALITY_SETTINGS.MINIMUM = 'minimum';
QualityManager.QUALITY_VALUES[QualityManager.QUALITY_SETTINGS.MINIMUM] = {
	'tank explosion smoke count': 1,
	'tank explosion fragment count': 0,
	'missile launch smoke count': 2,
	'missile smoke frequency': 360,
	'mine explosion smoke count': 0,
	'crate land dust count': 2,
	'aimer min segment length': 0.5,
	'aimer off max segment length': 2,
	'aimer on max segment length': 1,
	'bullet puff count': 1,
	'shield inverse bolt probability': 1.0,
	'shield spark particles per emit': 1,
	'spawn zone inverse unstable particle probability': 1.0,
	'spawn zone num collapse particles': 10
};

UIConstants.classField('SETTINGS_QUALITY_MAX_OPTION_HEIGHT', 200);

/**
 * Insert minimum option element
 */
ProxyHelper.interceptFunction(TankTrouble.SettingsBox, 'init', (original, ...args) => {
	original(...args);

	const minQuality = $(`<option value="${ QualityManager.QUALITY_SETTINGS.MINIMUM }">Minimum</option>`);
	TankTrouble.SettingsBox.settingsQualityOptions.push(minQuality);
	TankTrouble.SettingsBox.settingsQualitySelect.append(minQuality);
	TankTrouble.SettingsBox.settingsQualitySelect.iconselectmenu('refresh');
});

/** Don't emit tank rubble if quality is set to minimum */
ProxyHelper.interceptFunction(UIRubbleGroup.prototype, 'emit', (original, ...args) => {
	if (QualityManager.getQuality() === QualityManager.QUALITY_SETTINGS.MINIMUM) return null;
	return original(...args);
}, { isPrototype: true });

/**
 * Don't add camera shake in minimum quality
 */
ProxyHelper.interceptFunction(Game.UIGameState, '_addCameraShake', (original, ...args) => {
	if (QualityManager.getQuality() !== QualityManager.QUALITY_SETTINGS.MINIMUM) return original(...args);
	return null;
}, { isClassy: true });

export const _isESmodule = true;
