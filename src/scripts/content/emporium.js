import ProxyHelper from '../utils/proxyHelper.js';

/**
 * Insert wallet elements in shop overlay navigator
 */
ProxyHelper.interceptFunction(TankTrouble.VirtualShopOverlay, '_initialize', (original, ...args) => {
	original(...args);

	// Initialize wallet elements
	TankTrouble.VirtualShopOverlay.walletGold = $("<div><button class='medium disabled' style='display: flex;'>Loading ...</button></div>");
	TankTrouble.VirtualShopOverlay.walletDiamonds = $("<div><button class='medium disabled' style='display: flex;'>Loading ...</button></div>");
	TankTrouble.VirtualShopOverlay.navigation.append([TankTrouble.VirtualShopOverlay.walletGold, TankTrouble.VirtualShopOverlay.walletDiamonds]);
});

/**
 * Show wallet coins and diamonds in shop navigator
 */
ProxyHelper.interceptFunction(TankTrouble.VirtualShopOverlay, 'show', (original, ...args) => {
	original(...args);

	const [params] = args;
	Backend.getInstance().getCurrency(result => {
		if (typeof result === 'object') {
			// Set wallet currency from result
			const goldButton = TankTrouble.VirtualShopOverlay.walletGold.find('button').empty();
			const diamondsButton = TankTrouble.VirtualShopOverlay.walletDiamonds.find('button').empty();

			Utils.addImageWithClasses(goldButton, 'walletIcon', 'assets/images/virtualShop/gold.png');
			goldButton.append(result.getGold());
			Utils.addImageWithClasses(diamondsButton, 'walletIcon', 'assets/images/virtualShop/diamond.png');
			diamondsButton.append(result.getDiamonds());
		}
	}, () => {}, () => {}, params.playerId, Caches.getCurrencyCache());
});

export const _isESmodule = true;
