import ProxyHelper from '../utils/proxyHelper.js';
import { decode } from 'iso-8859-15';
import dismoji from 'discord_emoji';
import { matchSorter } from 'match-sorter';
import { timeUntil } from '../utils/timeUtils.js';

// TODO: add auto-disappearing chat after timeout
// TODO: add scroll

/**
 * @typedef {{word:string, range:[number, number]}} IndexiesOfWordInSelection
 */

/**
 * Add auto-complete for user mentions when typing @ in the chat input
 * @param chatInput Chat input instance
 */
const addAutocomplete = chatInput => {
	class Autocomplete {

		options = new Map();

		matches = [];

		/**
		 * Setup the dropdown class
		 * @param {HTMLInputElement} input Input to attach to
		 * @param {string} id autocomplete element ID
		 * @param {object} config Dropdown configuration override
		 */
		constructor(input, id, config) {
			this.input = $(input);
			this.wrapper = $('<div class="autocomplete-dropdown" tabindex="-1"></div>').insertAfter(this.input);
			this.textareaMirror = $('<div class="autocomplete-caret-mirror"></div>').appendTo(this.wrapper.parent());
			this.textareaMirrorInline = $('<span></span>').appendTo(this.textareaMirror);

			Object.assign(this, {
				// Default configuration
				lifetime: 10 * 60 * 100,
				inputHeight: 18,

				// User configuration
				...config
			});

			this.wrapper.attr('id', id);

			this.wrapper.insertAfter(this.input);

			this.hide();
		}

		#searchTerm = -1;

		/**
		 * Filter the dropdown elements when searchterm is set
		 * @param {any} term Term to match the dropdown registry for (string)
		 * @returns {any} Setter result (term)
		 */
		set searchTerm(term) {
			if (typeof term !== 'string') throw new Error('Autocomplete search term must be a string');
			if (this.#searchTerm === term) return term;

			this.#removeExpired();

			const allSymbols = Array.from(this.options.keys());
			this.matches = matchSorter(allSymbols, term, { keys: [symbol => symbol.description] });

			allSymbols.forEach(symbol => {
				const element = this.options.get(symbol).display;
				element.classList.toggle('match', this.matches.includes(symbol));
			});

			this.matches.forEach(symbol => {
				this.wrapper.append(this.options.get(symbol).display);
			});

			this.#resetToFirst();
			this.#searchTerm = term;

			return term;
		}

		/**
		 * Getter for `searchTerm`
		 * @returns `searchTerm`
		 */
		get searchTerm() {
			return this.#searchTerm;
		}

		/**
		 * Create up/down autocomplete iterator
		 * @example
		 * // Get current
		 * this.iterator.next(0).value;
		 * // Move one down
		 * this.iterator.next(1).value;
		 * // Move two up
		 * this.iterator.next(-2).value;
		 */
		iterator = (function* (options, that) {
			let i = 0;
			while (true) {
				const symbol = that.matches[i];

				const change = (yield [symbol, options.get(symbol)]) || 0;

				i = (i = (i + change) % Math.max(that.matches.length, 1)) < 0
					? i + that.matches.length
					: i;
			}
		}(this.options, this));

		/** Render the dropdown if not already visible */
		show() {
			if (this.isShowing()) return;

			this.#resetToFirst();

			this.wrapper.show();
			this.wrapper.scrollTop(0);
		}

		/** Hide the dropdown */
		hide() {
			this.wrapper.hide();
		}

		/**
		 * Check if the dropdown is visible
		 * @returns {boolean} Is the dropdown showing?
		 */
		isShowing() {
			return this.wrapper.is(':visible');
		}

		/**
		 * Compute dropdown x-shift to textarea value.
		 * Should be called when value changes in the input field
		 */
		update() {
			const transformed = this.input.val()
				.substr(0, this.input[0].selectionStart);
			this.textareaMirrorInline.html(transformed);

			const rects = this.textareaMirrorInline[0].getBoundingClientRect();
			const left = rects.right - rects.x;
			this.left = left
				+ Autocomplete.#toNumeric(this.input.css('left'))
				+ Autocomplete.#toNumeric(this.input.css('margin-left'))
				+ Autocomplete.#toNumeric(this.input.css('padding-left'));

			const isWordWrapped = this.#isWordWrapped();
			const leftShift = isWordWrapped ? 0 : Math.max(0, this.left - (this.wrapper.width() / 2));
			const topShift = this.input.outerHeight() - this.inputHeight;
			this.wrapper.css('margin-left', `${leftShift}px`);
			this.wrapper.css('margin-top', `${topShift + 25}px`);

			if (!this.isShowing()) this.show();
		}

		/**
		 * Get data for the current position
		 * @returns {[symbol, any]} Identifier and data for the current dropdown position
		 */
		getCurrent() {
			return this.iterator.next(0).value;
		}

		/**
		 * Add an autocomplete option to the dropdown
		 * @param {string} key Search option
		 * @param {HTMLElement} display Element to display in lookup
		 * @param {number} lifetime How long until removed from dropdown matches?
		 * @param {(...args: unknown) => void} submitCallback Event handler for mouseup
		 * @returns {boolean} Success in adding option?
		 */
		addOption(key, display, lifetime, submitCallback) {
			const overrideSymbol = Array.from(this.options.keys())
				.find(({ description }) => description === key);
			const symbolExists = typeof overrideSymbol === 'symbol';

			if (symbolExists) return false;

			const symbol = Symbol(key);

			display.addEventListener('mouseup', evt => {
				submitCallback(evt);

				this.#resetToFirst();
			});
			display.addEventListener('mouseover', () => {
				const symbols = this.matches;
				const [currentSymbol] = this.iterator.next(0).value;
				const distToHover = symbols.indexOf(symbol);
				const distToCurrent = symbols.indexOf(currentSymbol);

				this.navigate(distToHover - distToCurrent, false);
			});

			const insert = [
				symbol,
				{
					inserted: Date.now(),
					lifetime,
					display
				}
			];

			this.options.set(...insert);

			return true;
		}

		/**
		 * Remove option and corresponding HTMLElement from DOM
		 * @param {symbol} symbol Symbol for element to remove
		 * @returns {boolean} Was the option deleted?
		 */
		removeOption(symbol) {
			this.options.get(symbol)?.display.remove();
			this.matches = this.matches.filter(toRemove => toRemove !== symbol);
			return this.options.delete(symbol);
		}

		/**
		 * Clear all options from the dropdown
		 * @returns {boolean} Did options clear?
		 */
		clearOptions() {
			for (const symbol of this.options.keys()) this.removeOption(symbol);

			return this.options.size === 0
				&& this.wrapper.children().length === 0;
		}

		/**
		 * Navigate position in the dropdown up/down
		 * @param {number} shift Up/down shift as number
		 * @param {boolean} scroll Should we scroll to the element?
		 * @returns {symbol} Symbol identifier for our navigation result
		 */
		navigate(shift, scroll) {
			this.wrapper.children().removeClass('highlight');

			const [symbol, data] = this.iterator.next(shift).value;
			if (!symbol) return null;

			data.display.classList.add('highlight');
			if (scroll) {
				data.display.scrollIntoView({
					behavior: 'instant',
					block: 'nearest'
				});
			}

			return symbol;
		}

		/**
		 * Check if the input wraps to newline
		 * @returns {boolean} Whether the input is one or multiple lines
		 */
		#isWordWrapped() {
			return this.input.outerHeight() <= this.inputHeight;
		}

		/**
		 * Reset the position to the
		 * first item in the dropdown
		 */
		#resetToFirst() {
			const symbols = this.matches;
			const [currentSymbol] = this.iterator.next(0).value;
			const dist = symbols.indexOf(currentSymbol);

			this.navigate(-dist, true);
		}

		/**
		 * Remove expired entries
		 */
		#removeExpired() {
			for (const [symbol, value] of this.options.entries()) {
				if (value.lifetime === -1) continue;

				const expiry = value.inserted + value.lifetime;
				if (Date.now() > expiry) this.removeOption(symbol);
			}
		}

		/**
		 * Remove all non-numbers from string and return string as number
		 * @param {string} str String to parse
		 * @returns {number} String in number format
		 */
		static #toNumeric = str => Number(str.replace(/[^0-9.]/ug, ''));

	}

	/**
	 * Get the word and start/end indexies of the input selectionEnd
	 * @returns {undefined|IndexiesOfWordInSelection} Object with word and range start/end
	 */
	const getIndexiesOfWordInCurrentSelection = () => {
		// Separate string by whitespace and
		// list indexies for each word in array
		const tokenizedQuery = chatInput.value.split(/[\s\n]/u).reduce((acc, word, index) => {
			const previous = acc[index - 1];
			const start = index === 0 ? index : previous.range[1] + 1;
			const end = start + word.length;

			return acc.concat([ { word, range: [start, end] } ]);
		}, []);

		const currentWord = tokenizedQuery.find(({ range }) => range[0] < chatInput.selectionEnd && range[1] >= chatInput.selectionEnd);

		return currentWord;
	};

	const usernameAutocomplete = new Autocomplete(chatInput, 'mention');
	const emojiAutocomplete = new Autocomplete(chatInput, 'emoji');

	/**
	 * Returns the user that the selection is over,
	 * from the input value, if prefixed by @
	 * @returns {null|IndexiesOfWordInSelection} Mention username or null
	 */
	const getMentionFocus = () => {
		const currentWord = getIndexiesOfWordInCurrentSelection();
		const [mentions] = chatInput.value.split(/\s+(?=[^@])/u);
		const isTypingUserChat = mentions.startsWith('@');

		if (currentWord && isTypingUserChat) {
			const [, end] = currentWord.range;
			const [ currentMatch ] = usernameAutocomplete.getCurrent();
			return end <= mentions.length ? { match: currentMatch?.description, ...currentWord } : null;
		}

		return null;
	};

	/**
	 * Returns the emoji that the selection is over,
	 * from the input value, if prefixed by :
	 * @returns {null|IndexiesOfWordInSelection} Emoji identifier or null
	 */
	const getEmojiFocus = () => {
		const currentWord = getIndexiesOfWordInCurrentSelection();
		if (!currentWord) return null;

		const isTypingEmoji = currentWord.word.startsWith(':') && !(currentWord.word.endsWith(':'));

		if (isTypingEmoji) {
			// Start emoji search query after three characters
			if (currentWord.range[1] - currentWord.range[0] < 3) return null;

			const [ currentMatch ] = emojiAutocomplete.getCurrent();
			return { match: currentMatch?.description, ...currentWord };
		}

		return null;
	};

	/**
	 * Handle a dropdown submit event (enter, tab or click)
	 * by autofilling the value to the input field
	 * @param {Event} evt Event object
	 */
	const handleSubmit = evt => {
		const content = getMentionFocus() || getEmojiFocus();
		if (content === null) return;

		const [start, end] = content.range;
		if (content.match) {
			const before = chatInput.value.slice(0, start);
			const after = chatInput.value.substring(end, chatInput.value.length);

			const insertSpaceAfter = !after.startsWith(' ');

			const beforeValue = `${ before }${ content.match }${ insertSpaceAfter ? ' ' : '' }`;
			const cursorPosition = [beforeValue.length + 1, beforeValue.length + 1];
			chatInput.value = `${ beforeValue }${ after }`;

			chatInput.setSelectionRange(...cursorPosition);
		}

		evt.stopPropagation();
		evt.preventDefault();
		chatInput.dispatchEvent(new InputEvent('input'));
		chatInput.focus();
	};

	/**
	 * Insert new username to username autofill
	 * @param {object} playerDetails Player details object
	 */
	const insertMention = playerDetails => {
		if (typeof playerDetails === 'object') {
			const key = `@${ playerDetails.getUsername() }`;
			const display = document.createElement('div');
			const lifetime = 10 * 60 * 1000;
			display.innerText = playerDetails.getUsername();

			usernameAutocomplete.addOption(key, display, lifetime, handleSubmit);
		}
	};

	/**
	 * Insert new emoji to emoji autofill
	 * @param {string} key Emoji identifier
	 * @param {string} emoji Emoji symbol
	 */
	const insertEmoji = (key, emoji) => {
		const identifier = `:${key.replaceAll(' ', '_').replace(/[^a-zA-Z0-9_]/gu, '') }:`;

		const display = document.createElement('div');
		display.innerText = `${ emoji } ${ identifier }`;

		emojiAutocomplete.addOption(identifier, display, -1, handleSubmit);
	};

	// Insert emojis from emoji list
	for (const [key, emoji] of Object.entries(dismoji)) insertEmoji(key, emoji);

	/**
	 * Event handler for received chat messages
	 * @param {object} data Event data
	 */
	const handleNewChatMessage = data => {
		const involvedPlayerIds = data.involvedPlayerIds || [...data.getFrom() || [], ...data.getTo() || []];
		const loggedIn = Users.getAllPlayerIds();
		const foreignPlayerIds = involvedPlayerIds.filter(playerId => !loggedIn.includes(playerId));

		for (const playerId of foreignPlayerIds) {
			Backend.getInstance().getPlayerDetails(result => {
				if (typeof result === 'object') {
					const key = `@${ result.getUsername() }`;
					const display = document.createElement('div');
					const lifetime = 10 * 60 * 1000;
					display.innerText = result.getUsername();

					usernameAutocomplete.addOption(key, display, lifetime, handleSubmit);
				}
			}, () => {}, () => {}, playerId, Caches.getPlayerDetailsCache());
		}
	};

	/**
	 * Show or hide autocompletes
	 */
	// eslint-disable-next-line complexity
	chatInput.addEventListener('input', ({ isComposing }) => {
		if (isComposing) return;

		// Handle username autocomplete
		const userFocus = getMentionFocus();
		if (userFocus === null) {
			usernameAutocomplete.hide();
		} else {
			usernameAutocomplete.searchTerm = userFocus.word;
			if (!usernameAutocomplete.matches.length) {
				usernameAutocomplete.hide();
			} else {
				usernameAutocomplete.show();
				usernameAutocomplete.update();
			}
		}

		// Handle emoji autocomplete
		const emojiFocus = getEmojiFocus();
		if (emojiFocus === null) {
			emojiAutocomplete.hide();
		} else {
			emojiAutocomplete.searchTerm = emojiFocus.word;
			if (!emojiAutocomplete.matches.length) {
				emojiAutocomplete.hide();
			} else {
				emojiAutocomplete.show();
				emojiAutocomplete.update();
			}
		}
	});

	/**
	 * Handle key events for autocompletes
	 */
	chatInput.addEventListener('keydown', evt => {
		switch (evt.key) {
			case 'Enter':
			case 'Tab':
				handleSubmit(evt);
				break;
			case 'ArrowUp':
				emojiAutocomplete.navigate(-1, true);
				usernameAutocomplete.navigate(-1, true);
				evt.preventDefault();
				break;
			case 'ArrowDown':
				emojiAutocomplete.navigate(1, true);
				usernameAutocomplete.navigate(1, true);
				evt.preventDefault();
				break;
			default:
				break;
		}
	}, true);

	/** Event handler for TTClient.EVENTS.GAME_LIST_CHANGED */
	const handleGameListChanged = () => {
		const gameStates = ClientManager.getClient().getAvailableGameStates();

		for (const gameState of gameStates) {
			const playerStates = gameState.getPlayerStates();

			for (const player of playerStates) {
				const playerId = player.getPlayerId();

				Backend.getInstance().getPlayerDetails(
					insertMention,
					() => {},
					() => {},
					playerId,
					Caches.getPlayerDetailsCache()
				);
			}
		}
	};

	/**
	 * Event handler for client state changes (connect, disconnect, handshaked, etc.)
	 * @param {any} _self Self reference
	 * @param {string} _oldState Old client state
	 * @param {string} newState New client state
	 */
	const clientStateEventHandler = (_self, _oldState, newState) => {
		switch (newState) {
			case TTClient.STATES.UNCONNECTED:
				usernameAutocomplete.clearOptions();
				break;
			default:
				break;
		}
	};

	/**
	 * Event handler for new chat messages
	 * @param {any} _self Self reference
	 * @param {string} evt Event type
	 * @param {any} data Event data
	 */
	// eslint-disable-next-line complexity
	const clientEventHandler = (_self, evt, data) => {
		switch (evt) {
			case TTClient.EVENTS.USER_CHAT_POSTED:
			case TTClient.EVENTS.GLOBAL_CHAT_POSTED:
			case TTClient.EVENTS.CHAT_POSTED:
			case TTClient.EVENTS.SYSTEM_CHAT_POSTED:
			case TTClient.EVENTS.PLAYERS_BANNED:
			case TTClient.EVENTS.PLAYERS_UNBANNED:
				if (data) handleNewChatMessage(data);
				break;
			case TTClient.EVENTS.GAME_LIST_CHANGED:
				handleGameListChanged();
				break;
			default:
				break;
		}
	};

	ClientManager.getClient().addStateChangeListener(clientStateEventHandler, this);
	ClientManager.getClient().addEventListener(clientEventHandler, this);
};

/**
 * Prevent TankTrouble from clearing the chat when the client disconnects.
 *
 * Print message to chat when client switches server to separate conversations
 */
const preventServerChangeChatClear = () => {
	/** Never clear chat if client is unconnected */
	ProxyHelper.interceptFunction(TankTrouble.ChatBox, '_clearChat', (original, ...args) => {
		const isUnconnected = ClientManager.getClient().getState() === TTClient.STATES.UNCONNECTED;

		// Void the call if the client is unconnected
		// when the function is invoked
		if (isUnconnected) return null;

		return original(...args);
	});
};

/**
 * Show a welcome message with the server name instead of "Welcome to TankTrouble Comms"
 */
const betterWelcomeMessage = () => {
	/** Intercept welcome message with more meaningful response */
	ProxyHelper.interceptFunction(TankTrouble.ChatBox, '_updateStatusMessageAndAvailability', (original, ...args) => {
		const [systemMessageText, guestPlayerIds] = args;

		// Check for a welcome message. If match.
		// print a different system message
		if (systemMessageText === 'Welcome to TankTrouble Comms § § ') {
			const newServer = ClientManager.getAvailableServers()[ClientManager.multiplayerServerId];
			return original(`Connected to ${ newServer.name } ${ guestPlayerIds.length ? '§ ' : '' }`, guestPlayerIds);
		}

		return original(...args);
	});
};

/**
 * If the server responds a chat with the 'You are temporarily banned from chatting'
 * system message, then intercept and give a more meaningful response (unban time)
 */
const insertChatBanExpiryTime = () => {
	ProxyHelper.interceptFunction(TankTrouble.ChatBox, 'addSystemMessage', (original, ...args) => {
		const [, message] = args;
		if (message === 'You are temporarily banned from chatting') {
			const playerIds = Users.getAllPlayerIds();

			Backend.getInstance().getNewestTempBanValidities(tempBans => {
				if (typeof tempBans !== 'undefined') {
					// Current timestamp in seconds
					const now = Date.now() / 1000;

					// Filter temp bans for futures
					const bannedPlayers = Object.keys(tempBans).filter(playerId => tempBans[playerId] > now);

					Promise.all(
						bannedPlayers.map(playerId => new Promise(resolve => {
							Backend.getInstance().getPlayerDetails(details => {
								if (typeof details === 'object') resolve([playerId, details.getUsername()]);
								else resolve([playerId, 'Scrapped']);
							}, () => {}, () => {}, playerId, Caches.getPlayerDetailsCache());
						}))
					).then(usernameEntries => {
						const involvedPlayerIds = bannedPlayers;
						const involvedUsernameMap = Object.fromEntries(usernameEntries);

						// Message gets fuggly when we have multiple
						// banned users. For example:
						// 'User1 and User2 will be unbanned in 11 hours, 10 hours'
						// This is hopefully implausible, so we won't account for it
						let unbannedMessage = '@  will be unbanned in ';
						unbannedMessage += involvedPlayerIds.map(playerId => {
							const banExpiry = new Date(
								tempBans[playerId] * 1000
							);
							const untilUnban = timeUntil(banExpiry);
							return untilUnban.substring(3);
						}).join(', ');

						TankTrouble.ChatBox._addSystemMessage(
							involvedPlayerIds,
							involvedUsernameMap,
							unbannedMessage
						);
					});
				}
			}, () => {}, () => {}, playerIds, Caches.getTempBanValidityCache());
		} else {
			original(...args);
		}
	});
};

/**
 * Replace non-ISO-8859-15-compliant characters with a question mark.
 *
 * TankTrouble cannot store message outside this standard, and the chat will otherwise stall permanently.
 */
const escapeBadCharacters = () => {
	ProxyHelper.interceptFunction(TankTrouble.ChatBox, '_sendChat', (original, ...args) => {
		const message = args.pop();

		try {
			decode(message, { mode: 'fatal' });

			original(message, ...args);
		} catch {
			Utils.updateTooltip(TankTrouble.ChatBox.chatInput, 'Failed to send chat');
			setTimeout(() => Utils.updateTooltip(TankTrouble.ChatBox.chatInput, ''), 1_500);
		}
	});
};

/**
 * Intercept chat messages and insert emojis in the :emoji: syntax
 */
const insertEmojis = () => {
	const pattern = new RegExp(`:(${Object.keys(dismoji).join('|')}):`, 'gu');

	ProxyHelper.interceptFunction(TankTrouble.ChatBox, '_renderChatMessage', (original, ...args) => {
		args[6] = args[6].replace(pattern, match => dismoji[match.slice(1, -1)]);

		return original(...args);
	});
};

/**
 * Initialize all chat mods
 */
ProxyHelper.whenContentInitialized().then(() => {
	/* eslint-disable prefer-destructuring */
	const chatBody = TankTrouble.ChatBox.chatBody[0];
	const chatInput = TankTrouble.ChatBox.chatInput[0];
	/* eslint-enable prefer-destructuring*/

	addAutocomplete(chatInput);
	preventServerChangeChatClear();
	betterWelcomeMessage();
	escapeBadCharacters();
	insertChatBanExpiryTime();
	insertEmojis();

	TankTrouble.ChatBox.chatInput.tooltipster({
		position: 'right',
		theme: 'tooltipster-error',
		offsetX: 5,
		trigger: 'custom'
	});

	// Allow more characters in the chat input
	chatInput.setAttribute('maxlength', '255');

	const formWidth = new CSSStyleSheet();
	formWidth.insertRule('#chat:is(.opening,.open) .content, #chat:is(.opening,.open) textarea { width: 208px; }', 0);
	document.adoptedStyleSheets = [formWidth];

	// Create a mutation observer that looks for
	// changes in the chatBody's attributes
	new MutationObserver(() => {
		const width = Number(chatBody.offsetWidth || 220);

		formWidth.deleteRule(0);
		formWidth.insertRule(`#chat:is(.opening,.open) .content, #chat:is(.opening,.open) textarea { width: ${width - 12}px !important; }`, 0);

		chatInput.dispatchEvent(new InputEvent('input'));
	}).observe(chatBody, {
		attributes: true,
		characterData: false
	});
});

export const _isESmodule = true;
