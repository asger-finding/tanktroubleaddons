import { interceptFunction } from '../utils/gameUtils.js';
import { timeAgo } from '../utils/timeUtils.js';

/**
 * Insert creation date and player id elements
 */
interceptFunction(TankTrouble.AccountOverlay, '_initialize', (original, ...args) => {
	original(...args);

	TankTrouble.AccountOverlay.accountCreatedText = $('<div></div>');
	TankTrouble.AccountOverlay.playerIdText = $('<div></div>');

	TankTrouble.AccountOverlay.accountHeadline.after([
		TankTrouble.AccountOverlay.accountCreatedText,
		TankTrouble.AccountOverlay.playerIdText
	]);
});

/**
 * Render creation date and player id to the menu
 */
interceptFunction(TankTrouble.AccountOverlay, 'show', (original, ...args) => {
	original(...args);

	Backend.getInstance().getPlayerDetails(result => {
		if (typeof result === 'object') {
			const created = new Date(result.getCreated() * 1000);
			const formatted = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(created);

			TankTrouble.AccountOverlay.accountCreatedText.text(`Created: ${formatted} (${timeAgo(created)})`);
			TankTrouble.AccountOverlay.playerIdText.text(`Player ID: #${ result.getPlayerId() }`);
		}
	}, () => {}, () => {}, TankTrouble.AccountOverlay.playerId, Caches.getPlayerDetailsCache());
});

export const _isESmodule = true;
