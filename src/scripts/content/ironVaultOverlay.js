

export default class IronVaultOverlay {

	id = 'ironvault';

	content = $(`<div class="content ${ this.id }"></div>`);

	icon = $('<div class="icon"></div>');

	#initialized = false;

	#showing = false;

	get isShowing() {
		return this.#showing;
	}

	set isShowing(showing) {
		this.init();

		this.#showing = showing;
		this.content.toggle(showing);

		return this.#showing;
	}

	constructor(parent) {
		fetch(Addons.t_url('assets/menu/ironvault.svg'))
			.then(result => result.text())
			.then(body => {
				this.icon.html(body);
			});

		parent.bindOverlay(this);
	}

	init() {
		if (this.#initialized) return;

		const searchForPlayerWidget = $('<div></div>');
		const usernameHeading = $('<div class="heading">Username</div>');
		const usernameInput = $('<input type="text" placeholder="Laika">');
		const usernameSubmit = $('<button type="submit">Search</button>');
		const searchSeparator = $('<hr></hr>');
		const searchResult = $('<div></div>');

		usernameInput.button()
			.off('keydown')
			.css({
				'width': '130px',
				'color' : 'inherit',
				'text-align' : 'left',
				'outline' : 'none',
				'cursor' : 'text'
			});

		usernameSubmit.button();

		usernameSubmit.tooltipster({
			position: 'right',
			theme: 'tooltipster-error',
			offsetX: 5
		});

		searchSeparator.hide();

		searchForPlayerWidget.append([usernameHeading, searchSeparator, usernameInput, usernameSubmit, searchResult]);

		usernameSubmit.on('mouseup', () => {
			searchSeparator.hide();
			searchResult.empty();

			const username = usernameInput.val();
			this.insertPlayerDetails(username)
				.then(result => {
					searchSeparator.show();
					searchResult.append(result);
				})
				.catch(err => Utils.updateTooltip(usernameSubmit, err));
		});

		this.createSection({
			title: 'Search for player',
			id: 'ironvault-search',
			requiresReload: false
		}, [ searchForPlayerWidget ]);

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
	 * Search for a player and return TankTrouble and IronVault data as html elements
	 * @param {string} username Player username
	 * @returns {Promise<void>} Resolves when done or error
	 */
	insertPlayerDetails(username) {
		return new Promise((resolve, reject) => {
			if (typeof username !== 'string' || username === '') {
				reject('Input is empty');
				return;
			}

			Backend.getInstance().getPlayerDetailsByUsername(result => {
				if (typeof result === 'object') {
					const tankDetails = this.createTankDetails(result);
					resolve(tankDetails);
				} else {
					reject('User not found');
				}
			}, () => {}, () => {}, username, Caches.getPlayerDetailsByUsernameCache());
		});
	}

	/**
	 * Create a container with username, player id, rendered tank, rank and level
	 * @param {object} playerDetails Player details
	 */
	createTankDetails(playerDetails) {
		const container = $('<div></div>').css({
			display: 'grid',
			'grid-template': '"top top" auto "left right" auto / 130px auto'
		});

		const top = $('<div style="grid-area: top;"></div>').css('width', '100%');
		const left = $('<div style="grid-area: left;"></div>');
		const right = $('<div style="grid-area: right;"></div>');

		const username = $(`<stroked-text text="${ playerDetails.getUsername() }" width="100%" height="2em"></stroked-text>`).css({
			width: 'inherit',
			top: 0,
			left: 0
		});

		const canvas = document.createElement('canvas');
		canvas.width = UIConstants.TANK_ICON_WIDTH_LARGE;
		canvas.height = UIConstants.TANK_ICON_HEIGHT_LARGE;
		canvas.style.width = `${UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL] }px`;
		canvas.style.height = `${UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL] * 0.6 }px`;
		UITankIcon.loadPlayerTankIcon(canvas, UIConstants.TANK_ICON_SIZES.LARGE, playerDetails.getPlayerId());

		const playerId = $('<div class="heading"><div>');
		playerId.text(playerDetails.getPlayerId());

		const rank = playerDetails.getRank();
		const rankIndex = UIUtils.getRankLevelFromRank(rank);
		const rankToLevelUp = UIConstants.RANK_LEVELS[rankIndex];
		const rankTitle = UIConstants.RANK_TITLES[rankIndex];
		const formattedRank = rank.toString().replace(/\B(?=(?:\d{3})+(?!\d))/gu, ' ');
		const rankText = `${ rankTitle } (${ formattedRank })`;
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
		const formattedXp = xp.toString().replace(/\B(?=(?:\d{3})+(?!\d))/gu, ' ');
		const levelText = `Level ${ levelIndex + 1 } (${ formattedXp } xp)`;
		const levelProgress = $(`<div><stroked-text class="caption" text="${ levelText }" width="100%" height="2em"></stroked-text></div>`);
		levelProgress.progressbar({
			value: xp,
			max: xpToLevelUp,
			classes: {
				'ui-progressbar': 'ui-corner-all'
			}
		}).addClass('xp');

		top.append(username);
		left.append([canvas]);
		right.append(playerId, rankProgress, levelProgress);

		container.append([top, left, right]);

		return container;
	}

}

export const _isESmodule = true;
