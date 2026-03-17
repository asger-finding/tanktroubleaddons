import { interceptFunction, whenContentInitialized } from '../utils/gameUtils.js';
import { decode } from 'iso-8859-15';
import dismoji from 'discord_emoji';
import { matchSorter } from 'match-sorter';
import { timeUntil } from '../utils/timeUtils.js';

// TODO: add auto-disappearing chat after timeout

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
			this.matches = matchSorter(allSymbols, term, { keys: [symbol => symbol.description], keepDiacritics: true });

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
		 * @param {(...args: unknown) => void} submitCallback Event handler for mousedown
		 * @returns {boolean} Success in adding option?
		 */
		addOption(key, display, lifetime, submitCallback) {
			const overrideSymbol = Array.from(this.options.keys())
				.find(({ description }) => description === key);
			const symbolExists = typeof overrideSymbol === 'symbol';

			if (symbolExists) return false;

			const symbol = Symbol(key);

			display.addEventListener('mousedown', evt => {
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
	 * @returns {IndexiesOfWordInSelection|undefined} Object with word and range start/end
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
	 * @param {IndexiesOfWordInSelection} currentWord Current word at cursor position
	 * @returns {IndexiesOfWordInSelection|null} Mention username or null
	 */
	const getMentionFocus = (currentWord = getIndexiesOfWordInCurrentSelection()) => {
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
	 * @param {IndexiesOfWordInSelection} currentWord Current word at cursor position
	 * @returns {IndexiesOfWordInSelection|null} Emoji identifier or null
	 */
	const getEmojiFocus = (currentWord = getIndexiesOfWordInCurrentSelection()) => {
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

			evt.stopPropagation();
			evt.preventDefault();
			chatInput.dispatchEvent(new InputEvent('input'));
			chatInput.focus();
		}
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
			Backend.getInstance().getPlayerDetails(
				insertMention,
				() => {},
				() => {},
				playerId,
				Caches.getPlayerDetailsCache()
			);
		}
	};

	/**
	 * Show or hide autocompletes
	 */
	chatInput.addEventListener('input', ({ isComposing }) => {
		if (isComposing) return;

		const currentWord = getIndexiesOfWordInCurrentSelection();

		// Handle username autocomplete
		const userFocus = getMentionFocus(currentWord);
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
		const emojiFocus = getEmojiFocus(currentWord);
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
	const fetchedPlayerIds = new Set();
	/**
	 *
	 */
	const handleGameListChanged = () => {
		const gameStates = ClientManager.getClient().getAvailableGameStates();

		for (const gameState of gameStates) {
			const playerStates = gameState.getPlayerStates();

			for (const player of playerStates) {
				const playerId = player.getPlayerId();
				if (fetchedPlayerIds.has(playerId)) continue;
				fetchedPlayerIds.add(playerId);

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
				fetchedPlayerIds.clear();
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
	interceptFunction(TankTrouble.ChatBox, '_clearChat', (original, ...args) => {
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
	interceptFunction(TankTrouble.ChatBox, '_updateStatusMessageAndAvailability', (original, ...args) => {
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
	interceptFunction(TankTrouble.ChatBox, 'addSystemMessage', (original, ...args) => {
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
	interceptFunction(TankTrouble.ChatBox, '_sendChat', (original, ...args) => {
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
 * Allow scrolling through chat history instead of removing overflowing messages.
 * Adds a custom scrollbar on the left side of the chat body.
 * @param {HTMLElement} chatBody Chat body DOM element
 */
const addChatScroll = chatBody => {
	UIConstants.CHAT_BOX_MAX_NUM_MESSAGES = 200;

	// Prevent draggable from capturing scroll events on the chat body
	TankTrouble.ChatBox.chat.draggable('option', 'cancel', 'input, textarea, button, select, option, .body, .chat-scrollbar');

	// Move resize handle out of .body so it's not affected by the fade mask
	const $handle = TankTrouble.ChatBox.chatBodyResizeHandle;
	TankTrouble.ChatBox.chat[0].appendChild($handle[0]);
	/** Sync handle position to the inside bottom-right corner of .body */
	const syncHandle = () => {
		const [handle] = $handle;
		if (!handle.offsetWidth) return;
		handle.style.left = `${chatBody.offsetLeft + chatBody.offsetWidth - handle.offsetWidth}px`;
		handle.style.top = `${chatBody.offsetTop + chatBody.offsetHeight - handle.offsetHeight}px`;
	};

	/**
	 * Fade in the resize handle, only if the chat is open.
	 * Syncs position before showing since dimensions aren't available when hidden.
	 * @returns {JQuery} Animation chain
	 */
	$handle.show = () => {
		if (!TankTrouble.ChatBox.chat.hasClass('open') && !TankTrouble.ChatBox.chat.hasClass('opening')) return $handle;
		$handle.stop(true).css({ display: '', opacity: 0 });
		syncHandle();
		return $handle.animate({ opacity: 1 }, 200);
	};
	/**
	 * Fade out and hide the resize handle
	 * @returns {JQuery} Animation chain
	 */
	$handle.hide = () => $handle.stop(true).animate({ opacity: 0 }, 200, function() { $(this).css('display', 'none'); });
	new ResizeObserver(syncHandle).observe(chatBody);
	new MutationObserver(syncHandle).observe(chatBody, { attributes: true, attributeFilter: ['style'] });

	/**
	 * Virtual scroll — only render messages near the viewport instead of all 200.
	 * meta[] is parallel to TankTrouble.ChatBox.messages[] (oldest=0, newest=N-1).
	 * DOM order is newest-first (prepend). scrollTop=0 shows newest messages.
	 */

	const defaultHeight = 17;
	const bufferFactor = 2;
	const $chatBody = $(chatBody);

	/** @type {{ height: number|null, estimatedHeight: number, element: JQuery|null, rendered: boolean, lastWidth: number|null }[]} */
	const meta = [];
	/** @type {Set<ResizeObserver>} Pending height measurement observers, disconnected on close */
	const pendingObservers = new Set();
	let renderStart = 0;
	let renderEnd = 0;
	let lastBodyWidth = null;
	let scrollRAF = null;

	const topSpacer = document.createElement('div');
	topSpacer.className = 'virtual-scroll-spacer';
	const bottomSpacer = document.createElement('div');
	bottomSpacer.className = 'virtual-scroll-spacer';
	chatBody.appendChild(topSpacer);
	chatBody.appendChild(bottomSpacer);

	/**
	 * Get the cached or estimated height of a message
	 * @param {number} index Message index in meta[]
	 * @returns {number} Measured height if valid, otherwise estimated or default
	 */
	const getHeight = index => {
		const entry = meta[index];
		if (!entry) return defaultHeight;
		if (entry.height !== null && entry.lastWidth === lastBodyWidth) return entry.height;
		return entry.estimatedHeight || defaultHeight;
	};

	/**
	 * Align meta[] length with messages[], removing or adding entries as needed
	 */
	const syncMeta = () => {
		const { messages } = TankTrouble.ChatBox;
		while (meta.length > messages.length) {
			const removed = meta.shift();
			if (removed.element) removed.element.remove();
			renderStart = Math.max(0, renderStart - 1);
			renderEnd = Math.max(0, renderEnd - 1);
		}
		while (meta.length < messages.length)
			meta.push({ height: null, estimatedHeight: defaultHeight, element: null, rendered: false, lastWidth: null });
	};

	/**
	 * Calculate the [startIdx, endIdx) range of messages intersecting the buffered viewport
	 * @returns {[number, number]} Inclusive start, exclusive end indices into messages[]
	 */
	const calculateVisibleRange = () => {
		const count = TankTrouble.ChatBox.messages.length;
		if (count === 0) return [0, 0];

		const viewportHeight = chatBody.clientHeight;
		const buffer = viewportHeight * bufferFactor;
		const rangeTop = Math.max(0, chatBody.scrollTop - buffer);
		const rangeBottom = chatBody.scrollTop + viewportHeight + buffer;

		let cumulativeTop = 0;
		let startMsgIdx = count;
		let endMsgIdx = 0;

		for (let domIdx = 0; domIdx < count; domIdx++) {
			const msgIdx = count - 1 - domIdx;
			const height = getHeight(msgIdx);

			if (cumulativeTop + height > rangeTop && cumulativeTop < rangeBottom) {
				startMsgIdx = Math.min(startMsgIdx, msgIdx);
				endMsgIdx = Math.max(endMsgIdx, msgIdx + 1);
			}

			cumulativeTop += height;
			if (cumulativeTop > rangeBottom) break;
		}

		return startMsgIdx >= count ? [0, 0] : [startMsgIdx, endMsgIdx];
	};

	/**
	 * Insert a message element at the correct DOM position (newest first)
	 * @param {number} msgIdx Index of the message in messages[]
	 * @param {JQuery} $element jQuery element to insert
	 */
	const insertAtPosition = (msgIdx, $element) => {
		const count = TankTrouble.ChatBox.messages.length;
		for (let i = msgIdx + 1; i < count; i++) {
			if (meta[i]?.rendered && meta[i].element) {
				meta[i].element.after($element);
				return;
			}
		}
		$(topSpacer).after($element);
	};

	/**
	 * Render a single message via native render functions and cache its element
	 * @param {number} msgIdx Index of the message in messages[]
	 */
	const renderMessage = msgIdx => {
		const msg = TankTrouble.ChatBox.messages[msgIdx];
		if (!msg) return;

		if (msg.type === 'chat') {
			TankTrouble.ChatBox._renderChatMessage(
				msg.from, msg.to, msg.usernameMap, msg.addRecipients,
				msg.textColor, msg.strokeColor, msg.message,
				msg.chatMessageId, msg.reported, false, false
			);
		} else if (msg.type === 'system') {
			TankTrouble.ChatBox._renderSystemMessage(
				msg.involvedPlayerIds, msg.involvedUsernameMap,
				msg.message, false, false
			);
		}

		// Native render prepends to chatBody — capture the new first element
		const $el = $chatBody.children('.chatMessage').first();
		$el.stop(true, true).css({ display: '', opacity: 1 });

		const entry = meta[msgIdx];
		entry.element = $el;
		entry.height = $el[0].offsetHeight;
		entry.lastWidth = lastBodyWidth;
		entry.estimatedHeight = entry.height;

		// Move from prepend position to correct sorted position
		$el.detach();
		insertAtPosition(msgIdx, $el);
		entry.rendered = true;
	};

	/**
	 * Detach a rendered message from the DOM, measuring its height first
	 * @param {number} msgIdx Index of the message in messages[]
	 */
	const detachMessage = msgIdx => {
		const entry = meta[msgIdx];
		if (!entry?.rendered || !entry.element) return;

		if (entry.height === null || entry.lastWidth !== lastBodyWidth) {
			entry.height = entry.element[0].offsetHeight;
			entry.lastWidth = lastBodyWidth;
			entry.estimatedHeight = entry.height;
		}

		entry.element.detach();
		entry.rendered = false;
	};

	/** Update spacer heights to represent off-screen messages */
	const updateSpacers = () => {
		const count = TankTrouble.ChatBox.messages.length;
		let topHeight = 0;
		for (let i = renderEnd; i < count; i++) topHeight += getHeight(i);
		let bottomHeight = 0;
		for (let i = 0; i < renderStart; i++) bottomHeight += getHeight(i);
		topSpacer.style.height = `${topHeight}px`;
		bottomSpacer.style.height = `${bottomHeight}px`;
	};

	/** Ensure spacers are at the start and end of the chat body */
	const ensureSpacerOrder = () => {
		if (topSpacer !== chatBody.firstChild) chatBody.insertBefore(topSpacer, chatBody.firstChild);
		if (bottomSpacer !== chatBody.lastChild) chatBody.appendChild(bottomSpacer);
	};

	/** Reconcile rendered messages with the current visible range */
	const reconcile = () => {
		if (TankTrouble.ChatBox.messages.length === 0) return;

		const [newStart, newEnd] = calculateVisibleRange();
		if (newStart === renderStart && newEnd === renderEnd) return;

		for (let i = renderStart; i < renderEnd; i++)
			if (i < newStart || i >= newEnd) detachMessage(i);

		for (let i = newStart; i < newEnd; i++) {
			if (i < renderStart || i >= renderEnd) {
				const entry = meta[i];
				if (entry?.element && !entry.rendered) {
					if (entry.lastWidth !== lastBodyWidth) {
						entry.element.remove();
						entry.element = null;
						renderMessage(i);
					} else {
						insertAtPosition(i, entry.element);
						entry.rendered = true;
					}
				} else if (!entry?.element) {
					renderMessage(i);
				}
			}
		}

		renderStart = newStart;
		renderEnd = newEnd;
		updateSpacers();
		ensureSpacerOrder();
	};

	/** Detach all rendered messages, invalidate stale caches and re-render the visible range */
	const refresh = () => {
		for (let i = renderStart; i < renderEnd; i++) {
			const entry = meta[i];
			if (entry?.rendered && entry.element) {
				entry.element.detach();
				entry.rendered = false;
			}
		}
		$chatBody.children('.chatMessage').remove();
		syncMeta();

		const currentWidth = chatBody.clientWidth;
		if (currentWidth !== lastBodyWidth) {
			for (const entry of meta) {
				entry.height = null;
				if (entry.element) {
					entry.element.remove();
					entry.element = null;
				}
			}
			lastBodyWidth = currentWidth;
		}

		renderStart = 0;
		renderEnd = 0;
		chatBody.scrollTop = 0;
		reconcile();
	};

	/** Clear all cached elements and reset virtual scroll state */
	const clear = () => {
		for (const entry of meta)
			if (entry.element) entry.element.remove();

		meta.length = 0;
		renderStart = 0;
		renderEnd = 0;
		topSpacer.style.height = '0px';
		bottomSpacer.style.height = '0px';
	};

	/**
	 * Handle a newly added message from _addChatMessage or _addSystemMessage.
	 * Syncs meta[], captures the rendered element, and schedules reconciliation.
	 * @param {Function} original Original intercepted function
	 * @param {any[]} args Arguments passed to the original function
	 */
	const handleMessageAdded = (original, args) => {
		const { messages } = TankTrouble.ChatBox;
		const [oldestBefore] = messages;
		const firstChildBefore = chatBody.querySelector('.chatMessage');

		original(...args);

		// Detect if oldest was shifted out (at cap)
		if (messages.length > 0 && messages[0] !== oldestBefore && typeof oldestBefore !== 'undefined') {
			const removed = meta.shift();
			if (removed?.element) removed.element.remove();
			renderStart = Math.max(0, renderStart - 1);
			renderEnd = Math.max(0, renderEnd - 1);
		}

		// Detect if a new message was pushed
		if (meta.length < messages.length) {
			const newMeta = { height: null, estimatedHeight: defaultHeight, element: null, rendered: false, lastWidth: null };
			meta.push(newMeta);

			const firstChildAfter = chatBody.querySelector('.chatMessage');
			if (firstChildAfter && firstChildAfter !== firstChildBefore) {
				newMeta.element = $(firstChildAfter);
				newMeta.rendered = true;
				ensureSpacerOrder();

				const observer = new ResizeObserver(() => {
					observer.disconnect();
					pendingObservers.delete(observer);
					if (newMeta.element && newMeta.rendered) {
						newMeta.height = newMeta.element[0].offsetHeight;
						newMeta.lastWidth = lastBodyWidth;
						newMeta.estimatedHeight = newMeta.height;
					}
					reconcile();
				});
				pendingObservers.add(observer);
				observer.observe(firstChildAfter);
			}
		}
	};

	/** Hide the resize handle, cancel pending observers and destroy rendered messages on close */
	interceptFunction(TankTrouble.ChatBox, 'close', (original, ...args) => {
		$handle.stop(true).css({ display: 'none', opacity: 0 });
		clearTimeout(TankTrouble.ChatBox.resizeHandleTimeout);

		for (const observer of pendingObservers) observer.disconnect();
		pendingObservers.clear();

		for (const entry of meta) {
			if (entry.element) entry.element.remove();
			entry.element = null;
			entry.rendered = false;
		}
		renderStart = 0;
		renderEnd = 0;

		return original(...args);
	});

	/** Intercept native chat functions to use virtual scroll */
	interceptFunction(TankTrouble.ChatBox, '_updateChat', () => { reconcile(); });
	interceptFunction(TankTrouble.ChatBox, '_refreshChat', (_original, animate) => {
		if (animate) {
			$chatBody.stop(true).fadeTo(200, 0, () => {
				refresh();
				$chatBody.fadeTo(200, 1);
			});
		} else {
			refresh();
		}
	});
	interceptFunction(TankTrouble.ChatBox, '_renderAllMessages', () => {});
	interceptFunction(TankTrouble.ChatBox, '_addChatMessage', (original, ...args) => handleMessageAdded(original, args));
	interceptFunction(TankTrouble.ChatBox, '_addSystemMessage', (original, ...args) => handleMessageAdded(original, args));
	interceptFunction(TankTrouble.ChatBox, '_clearChat', (original, ...args) => {
		original(...args);
		if (TankTrouble.ChatBox.messages.length === 0) clear();
	});

	/** Custom scrollbar component */
	const scrollbar = document.createElement('div');
	scrollbar.className = 'chat-scrollbar';
	const thumb = document.createElement('div');
	thumb.className = 'chat-scrollbar-thumb';
	scrollbar.appendChild(thumb);

	TankTrouble.ChatBox.chat[0].appendChild(scrollbar);

	let dragging = false;

	/** Update scrollbar thumb size and position to reflect the current scroll state */
	const updateThumb = () => {
		const { scrollTop, scrollHeight, clientHeight } = chatBody;
		if (scrollHeight <= clientHeight) {
			scrollbar.style.display = 'none';
			return;
		}
		scrollbar.style.display = '';

		if (!dragging) {
			scrollbar.style.left = `${chatBody.offsetLeft - 12}px`;
			scrollbar.style.top = `${chatBody.offsetTop}px`;
			scrollbar.style.height = `${clientHeight}px`;
		}

		const thumbHeight = Math.max(20, (clientHeight / scrollHeight) * clientHeight);
		const maxScroll = scrollHeight - clientHeight;
		const thumbTop = (scrollTop / maxScroll) * (clientHeight - thumbHeight);
		thumb.style.height = `${thumbHeight}px`;
		thumb.style.top = `${thumbTop}px`;
	};

	chatBody.addEventListener('scroll', updateThumb, { passive: true });
	new ResizeObserver(updateThumb).observe(chatBody);
	new MutationObserver(mutations => {
		const relevant = mutations.some(mutation =>
			mutation.type === 'childList' || mutation.target.classList.contains('chatMessage')
		);
		if (relevant) updateThumb();
	}).observe(chatBody, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

	// Thumb drag handling
	let dragOffsetY = 0;
	thumb.addEventListener('mousedown', evt => {
		dragging = true;
		dragOffsetY = evt.clientY - thumb.getBoundingClientRect().top;
		thumb.classList.add('dragging');
		evt.preventDefault();
	});
	addEventListener('mousemove', evt => {
		if (!dragging) return;
		const scrollbarRect = scrollbar.getBoundingClientRect();
		const thumbHeight = thumb.offsetHeight;
		const trackHeight = scrollbarRect.height - thumbHeight;
		if (trackHeight <= 0) return;

		const thumbTop = Math.max(0, Math.min(evt.clientY - scrollbarRect.top - dragOffsetY, trackHeight));
		const scrollRatio = thumbTop / trackHeight;
		chatBody.scrollTop = scrollRatio * (chatBody.scrollHeight - chatBody.clientHeight);
	});
	addEventListener('mouseup', () => {
		if (!dragging) return;
		dragging = false;
		thumb.classList.remove('dragging');
	});

	/** Scroll-driven reconciliation */
	chatBody.addEventListener('scroll', () => {
		if (scrollRAF) return;
		scrollRAF = requestAnimationFrame(() => {
			reconcile();
			scrollRAF = null;
		});
	}, { passive: true });
};

/**
 * Intercept chat messages and insert emojis in the :emoji: syntax
 */
const insertEmojis = () => {
	interceptFunction(TankTrouble.ChatBox, '_renderChatMessage', (original, ...args) => {
		args[6] = args[6].replace(/:(?<name>[a-zA-Z0-9_]+):/gu, (match, key) => dismoji[key] ?? match);

		return original(...args);
	});
};

/**
 * Initialize all chat mods
 */
whenContentInitialized().then(() => {
	/* eslint-disable prefer-destructuring */
	const chatBody = TankTrouble.ChatBox.chatBody[0];
	const chatInput = TankTrouble.ChatBox.chatInput[0];
	/* eslint-enable prefer-destructuring*/

	addAutocomplete(chatInput);
	preventServerChangeChatClear();
	betterWelcomeMessage();
	addChatScroll(chatBody);
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

	const [chatContent] = TankTrouble.ChatBox.chatContent;

	/**
	 * Set textarea and form width to match the chat body, bypassing CSS transitions.
	 * The form uses fit-content so it derives its width from the textarea + padding.
	 * 28 = textarea left offset (25px) + horizontal padding (2px * ~1.5)
	 */
	const syncFormWidth = () => {
		const bodyWidth = Number(chatBody.offsetWidth || 220);
		chatContent.style.setProperty('width', `${bodyWidth + 14}px`, 'important');
		chatInput.style.setProperty('width', `${bodyWidth - 8}px`, 'important');
	};

	/** Clear inline form widths so native CSS can collapse them */
	const clearFormWidth = () => {
		chatContent.style.removeProperty('width');
		chatInput.style.removeProperty('width');
	};

	/** Set form width before open so it doesn't animate from 0 */
	interceptFunction(TankTrouble.ChatBox, 'open', (original, ...args) => {
		syncFormWidth();
		return original(...args);
	});

	/** Clear form width on close so native CSS collapses it */
	interceptFunction(TankTrouble.ChatBox, 'close', (original, ...args) => {
		clearFormWidth();
		return original(...args);
	});

	/** Sync .content and textarea width when the chat body resizes */
	new MutationObserver(() => {
		if (TankTrouble.ChatBox.chat.hasClass('open') || TankTrouble.ChatBox.chat.hasClass('opening'))
			syncFormWidth();

		chatInput.dispatchEvent(new InputEvent('input'));
	}).observe(chatBody, {
		attributes: true,
		characterData: false
	});

});

export const _isESmodule = true;
