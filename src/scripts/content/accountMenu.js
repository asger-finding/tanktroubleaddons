import { interceptFunction } from '../utils/gameUtils.js';
import { timeAgo } from '../utils/timeUtils.js';

/**
 * Insert creation date and player id elements
 */
interceptFunction(TankTrouble.AccountOverlay, '_initialize', function(original, ...args) {
	original(...args);

	this.accountCreatedText = $('<div></div>');
	this.playerIdText = $('<div></div>');

	this.accountHeadline.after([
		this.accountCreatedText,
		this.playerIdText
	]);
});

/**
 * Render creation date and player id to the menu
 */
interceptFunction(TankTrouble.AccountOverlay, 'show', function(original, ...args) {
	original(...args);

	Backend.getInstance().getPlayerDetails(result => {
		if (typeof result === 'object') {
			const created = new Date(result.getCreated() * 1000);
			const formatted = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(created);

			this.accountCreatedText.text(`Created: ${formatted} (${timeAgo(created)})`);
			this.playerIdText.text(`Player ID: #${ result.getPlayerId() }`);
		}
	}, () => {}, () => {}, this.playerId, Caches.getPlayerDetailsCache());
});

export const _isESmodule = true;
