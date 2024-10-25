import ProxyHelper from '../utils/proxyHelper.js';
import { matchSorter } from 'match-sorter';

// TODO: add auto-disappearing chat after timeout
// TODO: add scroll

/**
 * Add auto-complete for user mentions when typing @ in the chat input
 * @param chatInput Chat input instance
 */
const addMentionAutocomplete = chatInput => {
	class Autocomplete {

		options = new Map();

		matches = [];

		/**
		 * Setup the dropdown class
		 * @param input Input to attach to
		 * @param config Dropdown configuration (allow multiple of the same value, expiry time)
		 */
		constructor(input, config) {
			this.input = $(input);
			this.wrapper = $('<div class="autocomplete-dropdown" tabindex="-1"></div>').insertAfter(this.input);
			this.textareaMirror = $('<div class="autocomplete-caret-mirror"></div>').appendTo(this.wrapper.parent());
			this.textareaMirrorInline = $('<span></span>').appendTo(this.textareaMirror);

			Object.assign(this, {
				allowRepeats: false,
				autofillLifetime: 10 * 60 * 100,
				inputHeight: 18,
				...config
			});

			this.wrapper.insertAfter(this.input);


			this.hide();
		}

		#searchTerm = -1;

		/**
		 * Filter the dropdown elements when searchterm is set
		 * @param term String term to search the dropdown registry for
		 * @returns term
		 */
		set searchTerm(term) {
			if (this.#searchTerm !== term) {
				this.#removeExpired();

				const allSymbols = Array.from(this.options.keys());
				this.matches = matchSorter(allSymbols, term, { keys: [symbol => symbol.description] });
				for (const symbol of allSymbols) {
					const element = this.options.get(symbol).value;

					element.classList[this.matches.includes(symbol) ? 'add' : 'remove']('match');
				}
				for (const symbol of this.matches) this.wrapper.append(this.options.get(symbol).value);

				this.#resetToFirst();
			}

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
		 * @returns Is the dropdown showing?
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
		 * @returns Identifier and data for the current dropdown position
		 */
		getCurrent() {
			return this.iterator.next(0).value;
		}

		/**
		 * Add an autocomplete option to the dropdown
		 * @param option Option as string
		 * @param submitCallback Event handler for mouseup
		 * @returns Success in adding option?
		 */
		addOption(option, submitCallback) {
			const overrideSymbol = !this.allowRepeats
				&& Array.from(this.options.keys())
					.find(({ description }) => description === option);
			const symbolExists = typeof overrideSymbol === 'symbol';

			if (symbolExists) return false;

			const symbol = Symbol(option);

			const element = document.createElement('div');
			element.innerText = option;
			element.addEventListener('mouseup', evt => submitCallback(evt, evt.target.innerText));

			const insert = [
				symbol,
				{
					inserted: Date.now(),
					lifetime: this.autofillLifetime,
					value: element
				}
			];

			this.options.set(...insert);

			return true;
		}

		/**
		 * Add an array of text options to the dropdown
		 * @param options Options as string[]
		 * @param submitCallback Generalized event handler for mouseup for all options
		 */
		addOptions(options, submitCallback) {
			for (const option of options) this.addOption(option, submitCallback);
		}

		/**
		 * Remove option and corresponding HTMLElement from DOM
		 * @param symbol Symbol for element to remove
		 * @returns Was the option deleted?
		 */
		removeOption(symbol) {
			this.options.get(symbol)?.value.remove();
			this.matches = this.matches.filter(toRemove => toRemove !== symbol);
			return this.options.delete(symbol);
		}

		/**
		 * Clear all options from the dropdown
		 * @returns Did options clear?
		 */
		clearOptions() {
			for (const symbol of this.options.keys()) this.removeOption(symbol);

			return this.options.size === 0
				&& this.wrapper.children().length === 0;
		}

		/**
		 * Navigate position in the dropdown up/down
		 * @param direction Up/down shift as number
		 * @returns Identifier for where we navigated to
		 */
		navigate(direction) {
			this.wrapper.children().removeClass('highlight');

			const [symbol, data] = this.iterator.next(direction).value;
			if (!symbol) return null;

			data.value.classList.add('highlight');
			data.value.scrollIntoView(false);

			return symbol;
		}

		/**
		 * Check if the input wraps to newline
		 * @returns Whether the input is one or multiple lines
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

			this.navigate(-dist);
		}

		/**
		 * Remove expired entries
		 */
		#removeExpired() {
			for (const [symbol, value] of this.options.entries()) {
				const expiry = value.inserted + value.autofillLifetime;
				if (Date.now() > expiry) this.removeOption(symbol);
			}
		}

		/**
		 * Remove all non-numbers from string and return string as number
		 * @param str String to parse
		 * @returns String in number format
		 */
		static #toNumeric = str => Number(str.replace(/[^0-9.]/ug, ''));

	}

	const dropdown = new Autocomplete(chatInput);

	/**
	 * Get the word and start/end indexies of the input selectionEnd
	 * @returns Object with word and range start/end
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

	/**
	 * Returns the user that the selection is over, from the input value, if prefixed by a @
	 * @returns Mention username or null
	 */
	const getUserFocusIfMention = () => {
		const currentWord = getIndexiesOfWordInCurrentSelection();
		const [mentions] = chatInput.value.split(/\s+(?=[^@])/u);
		const isUserChat = mentions.startsWith('@');

		if (currentWord && isUserChat) {
			const [, end] = currentWord.range;
			return end <= mentions.length ? currentWord : null;
		}

		return null;
	};

	/**
	 * Handle a dropdown submit event (enter, tab or click)
	 * by autofilling the value to the input field
	 * @param evt Event object
	 * @param username Username to autofill
	 */
	const handleSubmit = (evt, username = dropdown.getCurrent()[0].description) => {
		const mention = getUserFocusIfMention();
		if (mention === null) return;

		const [start, end] = mention.range;
		if (username) {
			const before = chatInput.value.slice(0, start);
			const after = chatInput.value.substring(end, chatInput.value.length);

			const insertSpaceAfter = !after.startsWith(' ');

			const beforeValue = `${ before }@${ username }${ insertSpaceAfter ? ' ' : '' }`;
			const cursorPosition = [beforeValue.length + 1, beforeValue.length + 1];
			chatInput.value = `${ beforeValue }${ after }`;

			chatInput.setSelectionRange(...cursorPosition);
		}

		evt.preventDefault();

		chatInput.dispatchEvent(new InputEvent('input'));
	};

	/**
	 * Event handler for TTClient.EVENTS.GAME_LIST_CHANGED
	 */
	const handleGameListChanged = () => {
		const gameStates = ClientManager.getClient().getAvailableGameStates();

		for (const gameState of gameStates) {
			const playerStates = gameState.getPlayerStates();

			for (const player of playerStates) {
				const playerId = player.getPlayerId();

				Backend.getInstance().getPlayerDetails(result => {
					if (typeof result === 'object') dropdown.addOption(result.getUsername(), handleSubmit);
				}, () => {}, () => {}, playerId, Caches.getPlayerDetailsCache());
			}
		}
	};

	/**
	 * Event handler for received chat messages
	 * @param data Event data
	 */
	const handleNewChatMessage = data => {
		const involvedPlayerIds = data.involvedPlayerIds || [...data.getFrom() || [], ...data.getTo() || []];
		const loggedIn = Users.getAllPlayerIds();
		const foreignPlayerIds = involvedPlayerIds.filter(playerId => !loggedIn.includes(playerId));

		for (const playerId of foreignPlayerIds) {
			Backend.getInstance().getPlayerDetails(result => {
				if (typeof result === 'object') dropdown.addOption(result.getUsername(), handleSubmit);
			}, () => {}, () => {}, playerId, Caches.getPlayerDetailsCache());
		}
	};

	chatInput.addEventListener('input', ({ isComposing }) => {
		if (isComposing) return;

		const userFocus = getUserFocusIfMention();
		if (userFocus === null) {
			dropdown.hide();
			return;
		}

		dropdown.searchTerm = userFocus.word.replace(/^@/u, '');
		if (!dropdown.matches.length) {
			dropdown.hide();
			return;
		}

		// Show UI
		dropdown.show();
		dropdown.update();
	});

	// eslint-disable-next-line complexity
	chatInput.addEventListener('keydown', evt => {
		const userFocus = getUserFocusIfMention();
		if (userFocus === null) return;

		dropdown.searchTerm = userFocus.word.replace(/^@/u, '');
		if (!dropdown.matches.length) return;

		switch (evt.key) {
			case 'Enter':
			case 'Tab':
				handleSubmit(evt);
				break;
			case 'ArrowUp':
				dropdown.navigate(-1);
				evt.preventDefault();
				break;
			case 'ArrowDown':
				dropdown.navigate(1);
				evt.preventDefault();
				break;
			default:
				break;
		}
	}, false);

	/**
	 * State change event handler
	 * @param _self Self reference
	 * @param _oldState Old client state
	 * @param newState New client state
	 */
	const clientStateEventHandler = (_self, _oldState, newState) => {
		switch (newState) {
			case TTClient.STATES.UNCONNECTED:
				dropdown.clearOptions();
				break;
			default:
				break;
		}
	};

	/**
	 * Event handler for new chat messages
	 * @param _self Self reference
	 * @param evt Event type
	 * @param data Event data
	 */
	// eslint-disable-next-line complexity
	const clientEventHandler = (_self, evt, data) => {
		switch (evt) {
			case TTClient.EVENTS.GAME_LIST_CHANGED:
				handleGameListChanged();
				break;
			case TTClient.EVENTS.USER_CHAT_POSTED:
				if (data) handleNewChatMessage(data);
				break;
			case TTClient.EVENTS.GLOBAL_CHAT_POSTED:
			case TTClient.EVENTS.CHAT_POSTED:
				if (data) handleNewChatMessage(data);
				break;
			case TTClient.EVENTS.SYSTEM_CHAT_POSTED:
			case TTClient.EVENTS.PLAYERS_BANNED:
			case TTClient.EVENTS.PLAYERS_UNBANNED:
				if (data) handleNewChatMessage(data);
				break;
			default:
				break;
		}
	};

	ClientManager.getClient().addStateChangeListener(clientStateEventHandler, this);
	ClientManager.getClient().addEventListener(clientEventHandler, this);
};

/**
 * Prevent TankTrouble from clearing the chat when the client disconnects
 * Print message to chat when client switches server to separate conversations
 */
const preventServerChangeChatClear = () => {
	ProxyHelper.interceptFunction(TankTrouble.ChatBox, '_clearChat', (original, ...args) => {
		const isUnconnected = ClientManager.getClient().getState() === TTClient.STATES.UNCONNECTED;

		// Void the call if the client is unconnected
		// when the function is invoked
		if (isUnconnected) return null;

		return original(...args);
	});

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

ProxyHelper.whenContentInitialized().then(() => {
	/* eslint-disable prefer-destructuring */
	const chatBody = TankTrouble.ChatBox.chatBody[0];
	const chatInput = TankTrouble.ChatBox.chatInput[0];
	/* eslint-enable prefer-destructuring*/

	preventServerChangeChatClear();
	addMentionAutocomplete(chatInput);

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
