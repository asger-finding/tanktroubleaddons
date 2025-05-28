import { interceptFunction } from '../utils/gameUtils.js';

/**
 * Insert wallet elements in shop overlay navigator
 */
interceptFunction(TankTrouble.VirtualShopOverlay, '_initialize', function(original, ...args) {
	original(...args);

	// Initialize wallet elements
	this.walletGold = $("<div><button class='medium disabled' style='display: flex;'>Loading ...</button></div>");
	this.walletDiamonds = $("<div><button class='medium disabled' style='display: flex;'>Loading ...</button></div>");
	this.navigation.append([this.walletGold, this.walletDiamonds]);
});

/**
 * Show wallet coins and diamonds in shop navigator
 */
interceptFunction(TankTrouble.VirtualShopOverlay, 'show', function(original, ...args) {
	original(...args);

	const [params] = args;
	Backend.getInstance().getCurrency(result => {
		if (typeof result === 'object') {
			// Set wallet currency from result
			const goldButton = this.walletGold.find('button').empty();
			const diamondsButton = this.walletDiamonds.find('button').empty();

			Utils.addImageWithClasses(goldButton, 'walletIcon', 'assets/images/virtualShop/gold.png');
			goldButton.append(result.getGold());
			Utils.addImageWithClasses(diamondsButton, 'walletIcon', 'assets/images/virtualShop/diamond.png');
			diamondsButton.append(result.getDiamonds());
		}
	}, () => {}, () => {}, params.playerId, Caches.getCurrencyCache());
});

export const _isESmodule = true;
