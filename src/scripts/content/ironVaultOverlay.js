import { dispatchMessage, once } from '../common/ipcBridge.js';
import { generateUUID } from '../utils/mathUtils.js';
import { timeAgo } from '../utils/timeUtils.js';

/**
 * Trim a canvas to remove alpha pixels from each side
 * @param {HTMLCanvasElement} canvas Target canvas element
 * @param {number} threshold Alpha threshold. Range 0-255.
 * @returns {object} Width and height of trimmed canvcas and left-top coordinate of trimmed area
 */
const trimCanvas = (canvas, threshold = 0) => {
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	const { width } = canvas;
	const { height } = canvas;
	const imageData = ctx.getImageData(0, 0, width, height);
	const tlCorner = { x: width + 1, y: height + 1 };
	const brCorner = { x:-1, y:-1 };

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (imageData.data[((y * width + x) * 4) + 3] > threshold) {
				tlCorner.x = Math.min(x, tlCorner.x);
				tlCorner.y = Math.min(y, tlCorner.y);
				brCorner.x = Math.max(x, brCorner.x);
				brCorner.y = Math.max(y, brCorner.y);
			}
		}
	}

	const cut = ctx.getImageData(
		tlCorner.x,
		tlCorner.y,
		brCorner.x - tlCorner.x,
		brCorner.y - tlCorner.y
	);

	canvas.width = brCorner.x - tlCorner.x;
	canvas.height = brCorner.y - tlCorner.y;

	ctx.putImageData(cut, 0, 0);

	return { width: canvas.width, height: canvas.height, x: tlCorner.x, y: tlCorner.y };
};

/**
 * Add space thousands delimiters to a number and return it as a string
 * @param {number} number Number to delimit
 * @returns {string} Formatted number
 */
const spaceSeparateThousands = number => number.toString().replace(/\B(?=(?:\d{3})+(?!\d))/gu, ' ');

/**
 * Create ordinal from number
 * @param {number} number Number to convert
 * @returns {string} Number as ordinal
 */
const getOrdinal = number => {
	const suffixes = ['th', 'st', 'nd', 'rd'];
	const value = number % 100;
	return number + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
};

export default class IronVaultOverlay {

	id = 'ironvault';

	content = $(`<div class="content ${ this.id }"></div>`);

	icon = $('<div class="menuicon"></div>');

	#initialized = false;

	#showing = false;

	/**
	 * Is the overlay showing?
	 * @returns {boolean} Showing
	 */
	get isShowing() {
		return this.#showing;
	}

	/**
	 * @param {boolean} showing Should the menu show?
	 * @returns {boolean} Showing
	 */
	set isShowing(showing) {
		this.init();

		this.#showing = showing;
		this.content.toggle(showing);

		return this.#showing;
	}

	/**
	 * Create the overlay
	 * @param {class} parent Menu class
	 */
	constructor(parent) {
		fetch(Addons.t_url('assets/menu/ironvault.svg'))
			.then(result => result.text())
			.then(body => {
				this.icon.html(body);
			});

		parent.bindOverlay(this);
	}

	/**
	 * Initialize the overlay content
	 */
	init() {
		if (this.#initialized) return;

		this.searchForPlayerWidget = $('<div></div>');
		this.usernameInput = $('<input type="text" placeholder="Laika">');
		this.usernameSubmit = $('<button type="submit">Search</button>');
		this.searchSeparator = $('<hr>');
		this.searchResult = $('<div></div>');

		this.usernameInput.button()
			.off('keydown')
			.css('width', '130px');
		this.usernameSubmit.button();
		this.usernameSubmit.tooltipster({
			position: 'right',
			theme: 'tooltipster-error',
			offsetX: 5,
			trigger: 'custom'
		});
		this.searchSeparator.hide();
		this.searchForPlayerWidget.append([this.usernameInput, this.usernameSubmit, this.searchSeparator, this.searchResult]);

		this.usernameSubmit.on('mouseup', () => {
			this.searchSeparator.hide();
			this.searchResult.empty();

			const username = this.usernameInput.val();
			IronVaultOverlay.#insertPlayer(username)
				.then(result => {
					this.searchSeparator.show();
					this.searchResult.append(result);
				})
				.catch(err => IronVaultOverlay.#updateTooltipster(this.usernameSubmit, err.message));
		});

		this.createSection({
			title: 'Search for player',
			id: 'ironvault-search',
			requiresReload: false
		}, [ this.searchForPlayerWidget ]);

		this.#initialized = true;
	}

	/**
	 * Create a new content block with options
	 * @param {SectionOptions} sectionOpts Options for the section
	 * @param  {Widget[]} widgets JQuery UI widgets
	 * @returns New section
	 */
	// eslint-disable-next-line complexity
	createSection(sectionOpts, widgets = []) {
		const wrapper = $(`<fieldset id="${ sectionOpts.id }"></fieldset>`);
		const legend = $(`<legend>${ sectionOpts.title }</legend>`);

		if (sectionOpts.requiresReload) legend.append('<span class="requires-reload">*</span>');

		wrapper.append(legend);

		for (const widget of widgets) wrapper.append(widget);

		this.content.append(wrapper);

		return wrapper;
	}

	/**
	 * Update the search button error tooltip
	 * @param {JQuery} element Tooltipstered element
	 * @param {string} content Error content
	 */
	static #updateTooltipster(element, content) {
		Utils.updateTooltip(element, content);
		setTimeout(() => Utils.updateTooltip(element, ''), 1_500);
	}

	/**
	 * Search for a player and return TankTrouble and IronVault data as html elements
	 * @param {string} username Player username
	 * @returns {Promise<void>} Resolves when done or error
	 */
	static #insertPlayer(username) {
		return new Promise((resolve, reject) => {
			if (typeof username !== 'string' || username === '') {
				reject(new Error('Input is empty'));
				return;
			}

			Backend.getInstance().getPlayerDetailsByUsername(result => {
				if (typeof result === 'object') {
					const container = $('<div></div>');
					const tankDetails = IronVaultOverlay.#createTankDetails(result);
					const badges = IronVaultOverlay.#createBadges(result);
					const playerDetails = IronVaultOverlay.#createPlayerDetails(result);
					const competitionResults = IronVaultOverlay.#createCompetitionResults(result);

					container.append([tankDetails, badges, '<hr>', playerDetails, competitionResults]);

					resolve(container);
				} else {
					reject(new Error('User not found'));
				}
			}, () => {}, () => {}, username, Caches.getPlayerDetailsByUsernameCache());
		});
	}

	/**
	 * Create a container with username, player id, rendered tank, rank and level
	 * @param {object} playerDetails Player details
	 * @returns {JQuery} Container HTMLDivElement
	 */
	static #createTankDetails(playerDetails) {
		const container = $('<div id="tank-details"></div>');

		const left = $('<div id="tankbox" class="ui-corner-all ui-widget ui-widget-content"></div>');
		const right = $('<div id="ranklevelprogress"></div>');

		const canvas = document.createElement('canvas');
		canvas.width = UIConstants.TANK_ICON_WIDTH_LARGE;
		canvas.height = UIConstants.TANK_ICON_HEIGHT_LARGE;
		canvas.style.width = `${UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL] }px`;
		canvas.style.height = `${UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL] * 0.6 }px`;
		left.append([canvas]);

		UITankIcon.loadPlayerTankIcon(canvas, UIConstants.TANK_ICON_SIZES.LARGE, playerDetails.getPlayerId(), () => {
			const username = $(`<stroked-text text="${ playerDetails.getUsername() }" width="100px" height="2em"></stroked-text>`).css({
				width: 'inherit',
				top: 0,
				left: 0
			});
			left.append(username);

			requestAnimationFrame(() => {
				trimCanvas(canvas);
				canvas.style.width = '';
				canvas.style.height = UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL] * 0.6;
			});
		}, {});

		const rank = playerDetails.getRank();
		const rankIndex = UIUtils.getRankLevelFromRank(rank);
		const rankToLevelUp = UIConstants.RANK_LEVELS[rankIndex];
		const rankTitle = UIConstants.RANK_TITLES[rankIndex];
		const rankText = `${ rankTitle } (${ spaceSeparateThousands(rank) }${ rankToLevelUp ? `/${ spaceSeparateThousands(rankToLevelUp) }` : '' })`;
		const rankProgress = $(`<div><stroked-text class="caption" text="${ rankText }" width="100%" height="2em"></stroked-text></div>`);
		rankProgress.progressbar({
			value: rank,
			max: rankToLevelUp,
			classes: {
				'ui-progressbar': 'ui-corner-all'
			}
		}).addClass('rank');

		const xp = playerDetails.getXP();
		const levelIndex = UIUtils.getLevelFromXp(xp);
		const xpToLevelUp = UIConstants.XP_LEVELS[levelIndex];
		const levelText = `Level ${ levelIndex + 1 } (${ spaceSeparateThousands(xp) } xp)`;
		const levelProgress = $(`<div><stroked-text class="caption" text="${ levelText }" width="100%" height="2em"></stroked-text></div>`);
		levelProgress.progressbar({
			value: xp,
			max: xpToLevelUp,
			classes: {
				'ui-progressbar': 'ui-corner-all'
			}
		}).css('margin-top', '8px').addClass('xp');
		right.append(rankProgress, levelProgress);

		container.append([left, right]);

		return container;
	}

	/**
	 * Create a container with IronVault badges
	 * @param {object} playerDetails Player details
	 * @returns {JQuery} Container HTMLDivElement
	 */
	static #createBadges(playerDetails) {
		const container = $('<div id="badges"></div>');
		const playerId = playerDetails.getPlayerId();

		const endPoint = `https://ironvault.vercel.app/api/${ playerId }/badges`;
		const uuid = generateUUID();
		dispatchMessage(null, {
			type: 'CORS_EXEMPT_FETCH',
			data: {
				resource: endPoint,
				options: {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' }
				},
				uuid
			}
		});
		once('CORS_EXEMPT_FETCH_RESULT', evt => evt.detail?.data?.uuid === uuid, ({ detail }) => {
			if (!detail) return;

			const { result } = detail.data;
			if (!result.badges) return;

			for (const badge of result.badges) {
				const { description, svg } = badge;
				const image = $(`<img src="https://ironvault.vercel.app/assets/images/badges/${ svg }.svg">`);
				image.tooltipster({
					position: 'top',
					offsetY: 5,
					content: description
				});

				container.append(image);
			}

			if (container.children().length) container.before('<hr>');
		});

		return container;
	}

	/**
	 * Create a container containing crucial player details
	 * @param {object} playerDetails Player details
	 * @returns {JQuery} Container HTMLDivElement
	 */
	static #createPlayerDetails(playerDetails) {
		const container = $('<div id="player-details"></div>');

		const elements = [
			[
				'Kills',
				Addons.t_url('assets/menu/ironvault/kills.svg'),
				spaceSeparateThousands(playerDetails.getKills())
			],
			[
				'Victories',
				Addons.t_url('assets/menu/ironvault/victories.svg'),
				spaceSeparateThousands(playerDetails.getVictories())
			],
			[
				'Deaths',
				Addons.t_url('assets/menu/ironvault/deaths.svg'),
				spaceSeparateThousands(playerDetails.getDeaths())
			],
			[
				'Suicides',
				Addons.t_url('assets/menu/ironvault/suicides.svg'),
				spaceSeparateThousands(playerDetails.getSuicides())
			],
			[
				'Created',
				Addons.t_url('assets/menu/ironvault/created.svg'),
				new Intl.DateTimeFormat(navigator.language || 'en-US')
					.format(new Date(playerDetails.getCreated() * 1000))
			],
			[
				'Last login',
				Addons.t_url('assets/menu/ironvault/last-login.svg'),
				timeAgo(new Date(playerDetails.getLastLogin() * 1000))
			],
			[
				'Player ID',
				Addons.t_url('assets/menu/ironvault/player-id.svg'),
				playerDetails.getPlayerId()
			],
			[
				'Game Master',
				Addons.t_url('assets/menu/ironvault/game-master.svg'),
				`Level ${ playerDetails.getGmLevel() }`
			]

		].map(item => {
			const [key, iconUrl, value] = item;

			const wrapper = $('<div class="stat ui-corner-all ui-widget ui-widget-content"></div>');
			const icon = $('<div class="icon"></img>');
			const stat = $('<div class="value"></div>');
			const description = $('<div class="description"></div>');

			fetch(iconUrl)
				.then(result => result.text())
				.then(iconSvg => icon.append(iconSvg));

			stat.text(value);
			description.text(key);

			wrapper.append([icon, stat, description]);
			return wrapper;
		});

		container.append(elements);

		return container;
	}


	/**
	 * Create a container with IronVault competition results
	 * @param {object} playerDetails Player details
	 * @returns {JQuery} Container HTMLDivElement
	 */
	static #createCompetitionResults(playerDetails) {
		const container = $('<div id="competitions"></div>');
		const playerId = playerDetails.getPlayerId();

		const endPoint = `https://ironvault.vercel.app/api/${ playerId }/competitions`;
		const uuid = generateUUID();
		dispatchMessage(null, {
			type: 'CORS_EXEMPT_FETCH',
			data: {
				resource: endPoint,
				options: {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' }
				},
				uuid
			}
		});
		once('CORS_EXEMPT_FETCH_RESULT', evt => evt.detail?.data?.uuid === uuid, ({ detail }) => {
			if (!detail) return;

			const { result } = detail.data;
			if (!result.competitions) return;

			for (const competition of result.competitions) {
				const wrapper = $('<div class="competition ui-corner-all ui-widget ui-widget-content"></div>');

				const { name, year, place, svg } = competition;
				const image = $(`<img class="icon" src="https://ironvault.vercel.app/assets/images/competitions/${ svg }.svg">`);
				const competitionName = $('<div class="name"></div>');
				const competitionResult = $('<div class="result"></div>');

				competitionName.text(`${ name } ${ year }`);
				competitionResult.text(`${ getOrdinal(place) } place`);

				wrapper.append([image, competitionName, competitionResult]);
				container.append(wrapper);
			}

			if (container.children().length) container.before('<hr>');
		});

		return container;
	}
}

export const _isESmodule = true;
