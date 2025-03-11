import ProxyHelper from '../utils/proxyHelper.js';

/**
 * Initialize death count elements
 */
ProxyHelper.interceptFunction(TankTrouble.TankInfoBox, '_initialize', (original, ...args) => {
	original(...args);

	// Initialize death info elements
	TankTrouble.TankInfoBox.infoDeathsDiv = $('<tr/>');
	TankTrouble.TankInfoBox.infoDeathsIcon = $(`<img class="standard" src="${Addons.t_url('assets/tankInfo/deaths.{{png|avif}}')}" srcset="${Addons.t_url('assets/tankInfo/deaths@2x.{{png|avif}}')} 2x"/>`);
	TankTrouble.TankInfoBox.infoDeaths = $('<div/>');

	// Align to center
	TankTrouble.TankInfoBox.infoDeathsDiv.css({
		display: 'flex',
		'align-items': 'center',
		margin: '0 auto',
		width: 'fit-content'
	});

	TankTrouble.TankInfoBox.infoDeathsDiv.tooltipster({
		position: 'left',
		offsetX: 5
	});

	TankTrouble.TankInfoBox.infoDeathsDiv.append(TankTrouble.TankInfoBox.infoDeathsIcon);
	TankTrouble.TankInfoBox.infoDeathsDiv.append(TankTrouble.TankInfoBox.infoDeaths);
	TankTrouble.TankInfoBox.infoDeathsDiv.insertAfter(TankTrouble.TankInfoBox.infoTable);

	TankTrouble.TankInfoBox.infoDeaths.svg({
		settings: {
			width: UIConstants.TANK_INFO_MAX_NUMBER_WIDTH,
			height: 34
		}
	});
	TankTrouble.TankInfoBox.infoDeathsSvg = TankTrouble.TankInfoBox.infoDeaths.svg('get');
});

/**
 * Show death count elements to user
 */
ProxyHelper.interceptFunction(TankTrouble.TankInfoBox, 'show', (original, ...args) => {
	original(...args);

	TankTrouble.TankInfoBox.infoDeathsDiv.tooltipster('content', 'Deaths');
	TankTrouble.TankInfoBox.infoDeathsSvg.clear();

	const [,, playerId] = args;

	Backend.getInstance().getPlayerDetails(result => {
		const deaths = typeof result === 'object' ? result.getDeaths() : 'N/A';

		const deathsText = TankTrouble.TankInfoBox.infoDeathsSvg.text(1, 22, deaths.toString(), {
			textAnchor: 'start',
			fontFamily: 'Arial Black',
			fontSize: 14,
			fill: 'white',
			stroke: 'black',
			strokeLineJoin: 'round',
			strokeWidth: 3,
			letterSpacing: 1,
			paintOrder: 'stroke'
		});
		const deathsLength = Utils.measureSVGText(deaths.toString(), {
			fontFamily: 'Arial Black',
			fontSize: 14
		});

		const scaleAndTranslate = Utils.getSVGScaleAndTranslateToFit(UIConstants.TANK_INFO_MAX_NUMBER_WIDTH, deathsLength + 7, 34, 'left');
		TankTrouble.TankInfoBox.infoDeathsSvg.configure(deathsText, { transform: scaleAndTranslate });
	}, () => {}, () => {}, playerId, Caches.getPlayerDetailsCache());
});

export const _isESmodule = true;
