import { interceptFunction } from '../utils/gameUtils.js';

/**
 * Initialize death count elements
 */
interceptFunction(TankTrouble.TankInfoBox, '_initialize', function(original, ...args) {
	original(...args);

	// Initialize death info elements
	this.infoDeathsDiv = $('<tr/>');
	this.infoDeathsIcon = $(`<img class="standard" src="${Addons.t_url('assets/tankInfo/deaths.{{png|avif}}')}" srcset="${Addons.t_url('assets/tankInfo/deaths@2x.{{png|avif}}')} 2x"/>`);
	this.infoDeaths = $('<div/>');

	// Align to center
	this.infoDeathsDiv.css({
		display: 'flex',
		'align-items': 'center',
		margin: '0 auto',
		width: 'fit-content'
	});

	this.infoDeathsDiv.tooltipster({
		position: 'left',
		offsetX: 5
	});

	this.infoDeathsDiv.append(this.infoDeathsIcon);
	this.infoDeathsDiv.append(this.infoDeaths);
	this.infoDeathsDiv.insertAfter(this.infoTable);

	this.infoDeaths.svg({
		settings: {
			width: UIConstants.TANK_INFO_MAX_NUMBER_WIDTH,
			height: 34
		}
	});
	this.infoDeathsSvg = this.infoDeaths.svg('get');
});

/**
 * Show death count elements to user
 */
interceptFunction(TankTrouble.TankInfoBox, 'show', function(original, ...args) {
	original(...args);

	this.infoDeathsDiv.tooltipster('content', 'Deaths');
	this.infoDeathsSvg.clear();

	const [,, playerId] = args;

	Backend.getInstance().getPlayerDetails(result => {
		const deaths = typeof result === 'object' ? result.getDeaths() : 'N/A';

		const deathsText = this.infoDeathsSvg.text(1, 22, deaths.toString(), {
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
		this.infoDeathsSvg.configure(deathsText, { transform: scaleAndTranslate });
	}, () => {}, () => {}, playerId, Caches.getPlayerDetailsCache());
});

export const _isESmodule = true;
