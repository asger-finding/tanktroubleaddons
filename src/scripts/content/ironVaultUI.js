import { dispatchMessage, once } from '../common/ipcBridge.js';
import { generateUUID } from '../utils/mathUtils.js';
import { timeAgo } from '../utils/timeUtils.js';

/**
 * Load a source into an image and resolve when loaded
 * @param {string} src Image source
 * @returns {Promise<HTMLImageElement>} Image once loaded
 */
const loadImage = src => new Promise((resolve, reject) => {
	const image = new Image();
	image.crossOrigin = 'Anonymous';
	image.src = src;
	/**
	 * Resolve when the image has loaded
	 * @returns {HTMLImageElement} Image once loaded
	 */
	image.onload = () => resolve(image);
	/**
	 * Reject promise if image load fails
	 * @param {Event} ev Error reason
	 * @returns {Event} Error event
	 */
	image.onerror = ev => reject(ev);
});

/**
 * Trim a canvas to remove alpha pixels from each side
 * @param {CanvasRenderingContext2D} ctx Canvas context
 * @param {number} threshold Alpha threshold. Range 0-255.
 * @returns {object} Width and height of trimmed canvas and left-top coordinate of trimmed area
 */
const trimCanvas = (ctx, threshold = 0) => {
	const { canvas } = ctx;
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
 * Merge two image data layers into one layer, ignoring alpha.
 * @param {ImageData} baseLayer Base image data
 * @param {ImageData} onTopLayer Image data to add on top
 * @returns {ImageData} Merged layers
 */
function layerImageData(baseLayer, onTopLayer) {
	const { width } = onTopLayer;
	const { height } = onTopLayer;

	// Create a new ImageData object to store the result
	const resultImageData = new ImageData(width, height);

	// Get the pixel data arrays
	const data1 = onTopLayer.data;
	const data2 = baseLayer.data;
	const resultData = resultImageData.data;

	for (let i = 0; i < data1.length; i += 4) {
		// Extract RGBA values for imageData1
		const r1 = data1[i];
		const g1 = data1[i + 1];
		const b1 = data1[i + 2];
		const a1 = data1[i + 3] / 255;

		// Extract RGBA values for imageData2
		const r2 = data2[i];
		const g2 = data2[i + 1];
		const b2 = data2[i + 2];
		const a2 = data2[i + 3] / 255;

		// Calculate the resulting alpha
		const alpha = a1 + a2 * (1 - a1);

		// Calculate the resulting color
		const r = Math.round((r1 * a1 + r2 * a2 * (1 - a1)) / alpha);
		const g = Math.round((g1 * a1 + g2 * a2 * (1 - a1)) / alpha);
		const b = Math.round((b1 * a1 + b2 * a2 * (1 - a1)) / alpha);

		// Set the resulting pixel data
		resultData[i] = r;
		resultData[i + 1] = g;
		resultData[i + 2] = b;

		// Denormalize alpha to [0, 255]
		resultData[i + 3] = Math.round(alpha * 255);
	}

	return resultImageData;
}

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

export default class IronVaultUI {

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
	 * Construct IronVault overlay
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
	 * Initialize the IronVault content
	 */
	init() {
		if (this.#initialized) return;

		this.searchForPlayerWidget = $('<div></div>');
		this.usernameInput = $('<input type="text" maxlength="32" placeholder="E.g.: Laika">');
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

		this.usernameInput.on('input', () => {
			const acceptedOnly = this.usernameInput.val().replace(/[^A-Za-z0-9_-]/gu, '');
			this.usernameInput.val(acceptedOnly);
		});
		this.usernameInput.on('keypress', ({ key }) => {
			const submit = key === 'Enter';
			if (submit) this.search(this.usernameInput.val());

			return !submit;
		});
		this.usernameSubmit.on('mouseup', () => this.search(this.usernameInput.val()));

		this.#createSection({
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
	#createSection(sectionOpts, widgets = []) {
		const wrapper = $(`<fieldset id="${ sectionOpts.id }"></fieldset>`);
		const legend = $(`<legend>${ sectionOpts.title }</legend>`);

		if (sectionOpts.requiresReload) legend.append('<span class="requires-reload">*</span>');

		wrapper.append(legend);

		for (const widget of widgets) wrapper.append(widget);

		this.content.append(wrapper);

		return wrapper;
	}

	/**
	 * Search and insert player on search
	 * @param {string} username Player username
	 */
	search(username) {
		this.searchSeparator.hide();
		this.searchResult.empty();

		IronVaultUI.#insertPlayer(username)
			.then(result => {
				this.searchSeparator.show();
				this.searchResult.append(result);
			})
			.catch(err => IronVaultUI.#updateTooltipster(this.usernameSubmit, err.message));
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
				reject(new Error('Field is empty'));
				return;
			}

			TankTrouble.Ajax.checkUsername(response => {
				if (response.result.result || response.result.message === 'Username is already taken') {
					Backend.getInstance().getPlayerDetailsByUsername(result => {
						if (typeof result === 'object') {
							const container = $('<div></div>');
							const tankDetails = IronVaultUI.#createTankDetails(result);
							const badges = IronVaultUI.#createBadges(result);
							const playerDetails = IronVaultUI.#createPlayerDetails(result);
							const playerDetailsJSON = IronVaultUI.#createPlayerDetailsJSON(result);
							const competitionResults = IronVaultUI.#createCompetitionResults(result);

							container.append([tankDetails, badges, '<hr>', playerDetails, competitionResults, '<hr>', playerDetailsJSON]);

							resolve(container);
						} else {
							reject(new Error('User not found'));
						}
					}, () => {}, () => {}, username, Caches.getPlayerDetailsByUsernameCache());
				} else {
					reject(new Error(response.result.message));
				}
			}, response => reject(new Error(response.result.message)), () => {}, username, null);


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

		const tankContainer = $('<div class="tankcontainer"></div>');

		const canvas = IronVaultUI.#loadTankIcon(playerDetails);
		canvas.width = UIConstants.TANK_ICON_WIDTH_LARGE;
		canvas.height = UIConstants.TANK_ICON_HEIGHT_LARGE;
		canvas.style.width = '';
		canvas.style.height = UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL] * 0.6;
		tankContainer.append(canvas).appendTo(left);

		const username = $(`<stroked-text text="${ playerDetails.getUsername() }" width="100px" height="2em"></stroked-text>`).css({
			width: 'inherit',
			top: 0,
			left: 0
		});
		left.append(username);

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
	 * Render a tank (player details) onto a canvas
	 * @param {object} playerDetails Player details
	 * @returns {HTMLCanvasElement} Tank canvas
	 */
	static #loadTankIcon(playerDetails) {
		const canvas = document.createElement('canvas');
		canvas.width = UIConstants.TANK_ICON_WIDTH_LARGE;
		canvas.height = UIConstants.TANK_ICON_HEIGHT_LARGE;

		const ctx = canvas.getContext('2d', { willReadFrequently: true });

		// Custom tank image loader (ensure highest resolution, no outline)
		const tank = [
			{ type: 'accessory', data: ['back', playerDetails.getBackAccessory()] },
			{ type: 'base', data: [ 'turret', playerDetails.getTurretColour() ] },
			{ type: 'shade', data: 'turretShade' },
			{ type: 'base', data: [ 'leftTread', playerDetails.getTreadColour() ] },
			{ type: 'shade', data: 'leftTreadShade' },
			{ type: 'base', data: [ 'barrel', playerDetails.getTurretColour() ] },
			{ type: 'shade', data: 'barrelShade' },
			{ type: 'base', data: [ 'base', playerDetails.getBaseColour() ] },
			{ type: 'shade', data: 'baseShade' },
			{ type: 'base', data: [ 'rightTread', playerDetails.getTreadColour() ] },
			{ type: 'shade', data: 'rightTreadShade' },
			{ type: 'accessory', data: ['turret', playerDetails.getTurretAccessory()] },
			{ type: 'accessory', data: ['front', playerDetails.getFrontAccessory()] },
			{ type: 'accessory', data: ['barrel', playerDetails.getBarrelAccessory()] }
		].map(part => {
			switch (part.type) {
				case 'shade':
					return loadImage(g_url(`assets/images/tankIcon/${ part.data }-320@2x.png`))
						.then(shade => [null, shade])
						.catch(url => new Error(`Failed to load shading: ${ url }`));
				case 'accessory':
					return part.data[1] !== '0'
						? loadImage(g_url(`assets/images/accessories/${ part.data[0] }${ part.data[1] }-320@2x.png`))
							.then(accessory => [null, accessory])
							.catch(url => new Error(`Failed to load accessory: ${ url }`))
						: Promise.resolve(null);
				case 'base':
					return new Promise((resolve, reject) => {
						loadImage(g_url(`assets/images/tankIcon/${ part.data[0] }-320@2x.png`))
							.then(flat => {
								if (part.data[1].type === 'numeric') {
									// Resolve for flat color
									const color = parseInt(part.data[1].numericValue);
									resolve([color, flat]);
								} else {
									// Resolve for image
									loadImage(g_url(`assets/images/colours/colour${ part.data[1].imageValue }-320@2x.png`))
										.then(color => resolve([color, flat]))
										.catch(url => reject(new Error(`Failed to load color texture: ${ url }`)));
								}
							})
							.catch(url => reject(new Error(`Failed to load color mask: ${ url }`)));
					});
				default:
					throw new Error('Tank part must be "shade", "accessory" or "base"');
			}
		});

		Promise.all(tank).then(result => {
			const { width, height } = canvas;
			const initialBuffer = ctx.getImageData(0, 0, width, height);

			result.reduce((currentBuffer, part) => {
				if (part === null) return currentBuffer;

				const [fill, image] = part;

				ctx.clearRect(0, 0, width, height);

				// We simply draw the part
				if (!fill) {
					ctx.putImageData(currentBuffer, 0, 0);
					ctx.drawImage(image, 0, 0, width, height);

					return ctx.getImageData(0, 0, width, height);
				}

				// We need to mask a shape with an image or fill color
				ctx.save();

				// Draw mask
				ctx.drawImage(image, 0, 0, width, height);

				// Only apply where the mask is
				ctx.globalCompositeOperation = 'source-in';

				// Apply the fill (color or texture)
				if (typeof fill === 'number') {
					ctx.fillStyle = `#${ fill.toString(16).padStart(6, '0') }`;
					ctx.fillRect(0, 0, width, height);
					ctx.globalCompositeOperation = 'source-over';
				} else if (fill instanceof HTMLImageElement) {
					ctx.drawImage(fill, 0, 0, width, height);
					ctx.globalCompositeOperation = 'source-over';
				}

				const maskBuffer = ctx.getImageData(0, 0, width, height);
				return layerImageData(currentBuffer, maskBuffer);
			}, initialBuffer);
		}).catch(async() => {
			// An image errored. Show the 404 tank
			await loadImage(Addons.t_url('assets/menu/ironvault/404-tank.{{png|avif}}'))
				.then(image => {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

					const $canvas = $(canvas);
					$canvas.tooltipster({
						position: 'right',
						theme: 'tooltipster-error',
						offsetX: -20,
						trigger: 'custom'
					});
					IronVaultUI.#updateTooltipster($canvas, 'Failed to load tank');
				});
		}).finally(() => {
			trimCanvas(ctx);
		});

		return canvas;
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
	// eslint-disable-next-line complexity
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
				playerDetails.getLastLogin() === null ? 'Never logged in' : timeAgo(new Date(playerDetails.getLastLogin() * 1000))
			],
			[
				'Player ID',
				Addons.t_url('assets/menu/ironvault/player-id.svg'),
				playerDetails.getPlayerId()
			],
			...(playerDetails.getGmLevel() !== null ? [[
				'Game Master',
				Addons.t_url('assets/menu/ironvault/game-master.svg'),
				`Level ${ playerDetails.getGmLevel() }`
			]] : []),
			...(playerDetails.getGmLevel() === null
				&& TankTrouble.WallOfFame.admins.some(admin => admin.toLowerCase() === playerDetails.getUsername())
				?  [[
					'Game Master',
					Addons.t_url('assets/menu/ironvault/game-master-retired.svg'),
					'Retired'
				]] : [])

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
	 * Create a raw overview of the player details in the original JSON format
	 * @param {object} playerDetails Player details
	 * @returns {JQuery} Player details json container
	 */
	static #createPlayerDetailsJSON(playerDetails) {
		const container = $('<div id="playerdetails-json"></div>');
		const clicker = $('<input id="cm-toggle" class="hidden" type="checkbox"><label for="cm-toggle" class="clicker ui-widget" tabindex="1">View raw details ...</label>');
		const codeblock = $('<div class="codeblock"></div>');

		const value = JSON.stringify(playerDetails.data, null, 2)
			.replace(/"(?<_>[^"]+)":/gu, '$1:');

		container.append([clicker, codeblock]);
		container.appendTo('body');

		// Initialize CodeMirror
		// eslint-disable-next-line new-cap
		const editor = CodeMirror(codeblock[0], {
			value,
			mode: 'javascript',
			theme: 'blackboard',
			lineNumbers: false,
			readOnly: true,
			scrollbarStyle: null
		});

		// https://stackoverflow.com/questions/8349571/codemirror-editor-is-not-loading-content-until-clicked
		editor.refresh();
		container.remove();

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
