import { interceptFunction } from '../utils/gameUtils.js';

/**
 * Insert minimum option element
 */
interceptFunction(TankTrouble.SettingsBox, 'init', function(original, ...args) {
	original(...args);

	const minQuality = $(`<option value="${ QualityManager.QUALITY_SETTINGS.MINIMUM }">Minimum</option>`);
	this.settingsQualityOptions.push(minQuality);
	this.settingsQualitySelect.append(minQuality);
	this.settingsQualitySelect.val(QualityManager.getQuality());
	this.settingsQualitySelect.iconselectmenu('refresh');
});

/** Don't emit tank rubble if quality is set to minimum */
interceptFunction(UIRubbleGroup.prototype, 'emit', (original, ...args) => {
	if (QualityManager.getQuality() === QualityManager.QUALITY_SETTINGS.MINIMUM) return null;
	return original(...args);
});

/**
 * Don't add camera shake in minimum quality
 */
interceptFunction(Game.UIGameState, '_addCameraShake', (original, ...args) => {
	if (QualityManager.getQuality() !== QualityManager.QUALITY_SETTINGS.MINIMUM) return original(...args);
	return null;
}, { isClassy: true });

export const _isESmodule = true;
