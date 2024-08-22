import ProxyHelper from '../utils/proxyHelper.js';
import { timeAgo } from '../utils/timeUtils.js';

ProxyHelper.interceptFunction(TankTrouble.AccountOverlay, '_initialize', (original, ...args) => {
	original(...args);

	TankTrouble.AccountOverlay.accountCreatedText = $('<div></div>');
	TankTrouble.AccountOverlay.accountCreatedText.insertAfter(TankTrouble.AccountOverlay.accountHeadline);
});

ProxyHelper.interceptFunction(TankTrouble.AccountOverlay, 'show', (original, ...args) => {
	original(...args);

	Backend.getInstance().getPlayerDetails(result => {
		if (typeof result === 'object') {
			const created = new Date(result.getCreated() * 1000);
			const formatted = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(created);

			TankTrouble.AccountOverlay.accountCreatedText.text(`Created: ${formatted} (${timeAgo(created)})`);
		}
	}, () => {}, () => {}, TankTrouble.AccountOverlay.playerId, Caches.getPlayerDetailsCache());
});
