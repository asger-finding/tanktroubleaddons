import { whenContentInitialized } from '../utils/gameUtils.js';
import { decode } from 'iso-8859-15';
import dismoji from 'discord_emoji';
import { matchSorter } from 'match-sorter';
import { timeUntil } from '../utils/timeUtils.js';

/**
 * @typedef {{word:string, range:[number, number]}} IndexiesOfWordInSelection
 */
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
			lifetime: 10 * 60 * 100,
			inputHeight: 18,
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
	 *
	 */
	get searchTerm() {
		return this.#searchTerm;
	}

	/**
	 * Create up/down autocomplete iterator
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

	/**
	 *
	 */
	show() {
		if (this.isShowing()) return;
		this.#resetToFirst();
		this.wrapper.show();
		this.wrapper.scrollTop(0);
	}

	/**
	 *
	 */
	hide() {
		this.wrapper.hide();
	}

	/**
	 * @returns {boolean} Is the dropdown showing?
	 */
	isShowing() {
		return this.wrapper.is(':visible');
	}

	/**
	 * Compute dropdown x-shift to textarea value
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
	 *
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
		if (typeof overrideSymbol === 'symbol') return false;

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

		this.options.set(symbol, {
			inserted: Date.now(),
			lifetime,
			display
		});

		return true;
	}

	/**
	 *
	 * @param symbol
	 */
	removeOption(symbol) {
		this.options.get(symbol)?.display.remove();
		this.matches = this.matches.filter(toRemove => toRemove !== symbol);
		return this.options.delete(symbol);
	}

	/**
	 *
	 */
	clearOptions() {
		for (const symbol of this.options.keys()) this.removeOption(symbol);
		return this.options.size === 0 && this.wrapper.children().length === 0;
	}

	/**
	 *
	 * @param shift
	 * @param scroll
	 */
	navigate(shift, scroll) {
		this.wrapper.children().removeClass('highlight');
		const [symbol, data] = this.iterator.next(shift).value;
		if (!symbol) return null;

		data.display.classList.add('highlight');
		if (scroll)
			data.display.scrollIntoView({ behavior: 'instant', block: 'nearest' });

		return symbol;
	}

	/**
	 *
	 */
	#isWordWrapped() {
		return this.input.outerHeight() <= this.inputHeight;
	}

	/**
	 *
	 */
	#resetToFirst() {
		const symbols = this.matches;
		const [currentSymbol] = this.iterator.next(0).value;
		const dist = symbols.indexOf(currentSymbol);
		this.navigate(-dist, true);
	}

	/**
	 *
	 */
	#removeExpired() {
		for (const [symbol, value] of this.options.entries()) {
			if (value.lifetime === -1) continue;
			const expiry = value.inserted + value.lifetime;
			if (Date.now() > expiry) this.removeOption(symbol);
		}
	}

	/**
	 *
	 * @param str
	 */
	static #toNumeric = str => Number(str.replace(/[^0-9.]/ug, ''));
}
/**
 * Initialize autocomplete for @mentions and :emoji: in the chat input
 * @param {HTMLInputElement} chatInput Chat input DOM element
 */
const setupAutocomplete = chatInput => {
	const usernameAutocomplete = new Autocomplete(chatInput, 'mention');
	const emojiAutocomplete = new Autocomplete(chatInput, 'emoji');

	/**
	 * Get the word and start/end indices at the cursor position
	 * @returns {IndexiesOfWordInSelection|undefined}
	 */
	const getIndexiesOfWordInCurrentSelection = () => {
		const tokenizedQuery = chatInput.value.split(/[\s\n]/u).reduce((acc, word, index) => {
			const previous = acc[index - 1];
			const start = index === 0 ? index : previous.range[1] + 1;
			const end = start + word.length;
			return acc.concat([{ word, range: [start, end] }]);
		}, []);
		return tokenizedQuery.find(({ range }) => range[0] < chatInput.selectionEnd && range[1] >= chatInput.selectionEnd);
	};

	/**
	 *
	 * @param currentWord
	 */
	const getMentionFocus = (currentWord = getIndexiesOfWordInCurrentSelection()) => {
		const [mentions] = chatInput.value.split(/\s+(?=[^@])/u);
		const isTypingUserChat = mentions.startsWith('@');
		if (currentWord && isTypingUserChat) {
			const [, end] = currentWord.range;
			const [currentMatch] = usernameAutocomplete.getCurrent();
			return end <= mentions.length ? { match: currentMatch?.description, ...currentWord } : null;
		}
		return null;
	};

	/**
	 *
	 * @param currentWord
	 */
	const getEmojiFocus = (currentWord = getIndexiesOfWordInCurrentSelection()) => {
		if (!currentWord) return null;
		const isTypingEmoji = currentWord.word.startsWith(':') && !(currentWord.word.endsWith(':'));
		if (isTypingEmoji) {
			if (currentWord.range[1] - currentWord.range[0] < 3) return null;
			const [currentMatch] = emojiAutocomplete.getCurrent();
			return { match: currentMatch?.description, ...currentWord };
		}
		return null;
	};

	/**
	 *
	 * @param evt
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
	 *
	 * @param playerDetails
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
	 *
	 * @param key
	 * @param emoji
	 */
	const insertEmoji = (key, emoji) => {
		const identifier = `:${key.replaceAll(' ', '_').replace(/[^a-zA-Z0-9_]/gu, '')}:`;
		const display = document.createElement('div');
		display.innerText = `${ emoji } ${ identifier }`;
		emojiAutocomplete.addOption(identifier, display, -1, handleSubmit);
	};

	for (const [key, emoji] of Object.entries(dismoji)) insertEmoji(key, emoji);

	/**
	 *
	 * @param data
	 */
	const handleNewChatMessage = data => {
		const involvedPlayerIds = data.involvedPlayerIds || [...data.getFrom() || [], ...data.getTo() || []];
		const loggedIn = Users.getAllPlayerIds();
		const foreignPlayerIds = involvedPlayerIds.filter(playerId => !loggedIn.includes(playerId));
		for (const playerId of foreignPlayerIds) {
			Backend.getInstance().getPlayerDetails(
				insertMention, () => {}, () => {},
				playerId, Caches.getPlayerDetailsCache()
			);
		}
	};

	chatInput.addEventListener('input', ({ isComposing }) => {
		if (isComposing) return;
		const currentWord = getIndexiesOfWordInCurrentSelection();

		const userFocus = getMentionFocus(currentWord);
		if (userFocus === null) {
			usernameAutocomplete.hide();
		} else {
			usernameAutocomplete.searchTerm = userFocus.word;
			if (!usernameAutocomplete.matches.length) {usernameAutocomplete.hide();} else { usernameAutocomplete.show(); usernameAutocomplete.update(); }
		}

		const emojiFocus = getEmojiFocus(currentWord);
		if (emojiFocus === null) {
			emojiAutocomplete.hide();
		} else {
			emojiAutocomplete.searchTerm = emojiFocus.word;
			if (!emojiAutocomplete.matches.length) {emojiAutocomplete.hide();} else { emojiAutocomplete.show(); emojiAutocomplete.update(); }
		}
	});

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

	const fetchedPlayerIds = new Set();
	/**
	 *
	 */
	const handleGameListChanged = () => {
		const gameStates = ClientManager.getClient().getAvailableGameStates();
		for (const gameState of gameStates) {
			for (const player of gameState.getPlayerStates()) {
				const playerId = player.getPlayerId();
				if (fetchedPlayerIds.has(playerId)) continue;
				fetchedPlayerIds.add(playerId);
				Backend.getInstance().getPlayerDetails(
					insertMention, () => {}, () => {},
					playerId, Caches.getPlayerDetailsCache()
				);
			}
		}
	};

	/**
	 *
	 * @param _self
	 * @param _oldState
	 * @param newState
	 */
	const clientStateEventHandler = (_self, _oldState, newState) => {
		if (newState === TTClient.STATES.UNCONNECTED) {
			fetchedPlayerIds.clear();
			usernameAutocomplete.clearOptions();
		}
	};

	/**
	 *
	 * @param _self
	 * @param evt
	 * @param data
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
 * Replace :emoji_name: syntax with emoji characters
 * @param {string} message Chat message text
 * @returns {string} Message with emoji replacements
 */
const insertEmojis = message => message.replace(/:(?<name>[a-zA-Z0-9_]+):/gu, (match, key) => dismoji[key] ?? match);

/**
 * Create a username span element
 * @param {string} playerId Player ID
 * @param {string} text Display text
 * @param {boolean} isLocal Is this a local player?
 * @returns {JQuery} Username span
 */
const createUsernameSpan = (playerId, text, isLocal) =>
	$(`<span class="username${ isLocal ? '' : ' foreign' }"></span>`)
		.attr('data-player-id', playerId)
		.text(text);

const addonMethods = {
	open() {
		this.focus();
		if (!this.chat.hasClass('open') && !this.chat.hasClass('opening')) {
			this._syncFormWidth();
			this.chat.addClass('opening');
			this.chatBody.stop(true).delay(300).fadeIn(200, () => {
				this.chat.removeClass('opening').addClass('open');
			});
			this.chatStatusNew.hide('scale', 50);
			this.updateChatTimeout = setTimeout(() => this._refreshChat(false), 300);
		}
	},

	close() {
		if (this.chat.hasClass('open') || this.chat.hasClass('opening')) {
			this.chat.removeClass('open opening');
			this.blur();
			this.chatBody.stop(true).fadeOut(200);
			clearTimeout(this.updateChatTimeout);

			// Hide resize handle
			this.chatBodyResizeHandle.stop(true).css({ display: 'none', opacity: 0 });
			clearTimeout(this.resizeHandleTimeout);

			this._clearFormWidth();
		}
	},

	addSystemMessage(playerIds, message, unignorable) {
		// Ban expiry time feature
		if (message === 'You are temporarily banned from chatting') {
			const loggedInPlayerIds = Users.getAllPlayerIds();
			Backend.getInstance().getNewestTempBanValidities(tempBans => {
				if (typeof tempBans !== 'undefined') {
					const now = Date.now() / 1000;
					const bannedPlayers = Object.keys(tempBans).filter(pid => tempBans[pid] > now);
					Promise.all(
						bannedPlayers.map(pid => new Promise(resolve => {
							Backend.getInstance().getPlayerDetails(details => {
								if (typeof details === 'object') resolve([pid, details.getUsername()]);
								else resolve([pid, 'Scrapped']);
							}, () => {}, () => {}, pid, Caches.getPlayerDetailsCache());
						}))
					).then(entries => {
						const usernameMap = Object.fromEntries(entries);
						let unbannedMessage = '@  will be unbanned in ';
						unbannedMessage += bannedPlayers.map(pid => {
							const banExpiry = new Date(tempBans[pid] * 1000);
							return timeUntil(banExpiry).substring(3);
						}).join(', ');
						this._addSystemMessage(bannedPlayers, usernameMap, unbannedMessage);
					});
				}
			}, () => {}, () => {}, loggedInPlayerIds, Caches.getTempBanValidityCache());
			return;
		}

		// Native logic
		if (playerIds.length > 0) {
			let numDetailsResponses = 0;
			const numExpectedDetailsResponses = playerIds.length;
			const usernameMap = {};
			for (const pid of playerIds) usernameMap[pid] = '<ERROR>';

			/**
			 *
			 */
			const onComplete = () => {
				numDetailsResponses++;
				if (numDetailsResponses === numExpectedDetailsResponses)
					this._addSystemMessage(playerIds, usernameMap, message, unignorable);

			};

			for (const pid of playerIds) {
				Backend.getInstance().getPlayerDetails(
					result => {
						if (typeof result === 'object')
							usernameMap[result.getPlayerId()] = Utils.maskUnapprovedUsername(result);

					},
					() => {},
					onComplete,
					pid,
					Caches.getPlayerDetailsCache()
				);
			}
		} else {
			this._addSystemMessage([], null, message, unignorable);
		}
	},
	_addChatMessage(from, to, usernameMap, addRecipients, textColor, strokeColor, message, chatMessageId) {
		if (ArrayUtils.containsSome(from, this.ignoredPlayerIds)) return;

		const localPlayerIds = Users.getAllPlayerIds();
		this.messages.push({
			type: 'chat', from, to, usernameMap, addRecipients,
			textColor, strokeColor, message, chatMessageId, reported: false, localPlayerIds
		});

		if (this.messages.length > UIConstants.CHAT_BOX_MAX_NUM_MESSAGES)
			this.messages.shift();
		if (this.chat.hasClass('open'))
			this._renderChatMessage(from, to, usernameMap, addRecipients, textColor, strokeColor, message, chatMessageId, false, true, true, localPlayerIds);
		this._notifyNewMessage(Array.isArray(to) && ArrayUtils.containsSome(to, localPlayerIds));
	},

	_addSystemMessage(involvedPlayerIds, involvedUsernameMap, message, unignorable) {
		if (!unignorable && ArrayUtils.containsSome(involvedPlayerIds, this.ignoredPlayerIds)) return;

		const localPlayerIds = Users.getAllPlayerIds();
		this.messages.push({
			type: 'system',
			involvedPlayerIds,
			involvedUsernameMap,
			message,
			localPlayerIds
		});

		if (this.messages.length > UIConstants.CHAT_BOX_MAX_NUM_MESSAGES)
			this.messages.shift();

		if (this.chat.hasClass('open'))
			this._renderSystemMessage(involvedPlayerIds, involvedUsernameMap, message, true, true, localPlayerIds);


	},
	_renderChatMessage(from, to, usernameMap, addRecipients, textColor, strokeColor, message, chatMessageId, reported, animateHeight, animateFadeIn, localPlayerIds) {
		const chatMessage = $(`<div class="chatMessage message-${chatMessageId}"></div>`);
		const content = $('<span class="chat-content"></span>');

		if (!localPlayerIds) localPlayerIds = Users.getAllPlayerIds();

		// Render "from" usernames
		for (let i = 0; i < from.length; i++) {
			const suffix = i < from.length - 1 ? ',' : (addRecipients ? ' @' : ':');
			content.append(createUsernameSpan(from[i], usernameMap[from[i]] + suffix, localPlayerIds.includes(from[i])), ' ');
		}

		// Render "to" usernames if whisper
		if (addRecipients && to) {
			for (let i = 0; i < to.length; i++) {
				const suffix = i < to.length - 1 ? ',' : ':';
				content.append(createUsernameSpan(to[i], usernameMap[to[i]] + suffix, localPlayerIds.includes(to[i])), ' ');
			}
		}

		// Render message body with emoji replacement and URL detection
		const processedMessage = insertEmojis(message);
		const urlRegex = /https?:\/\/[\w\-_]+(?:\.[\w\-_]+)+(?:[\w\-.,@?^=%&:/~+#]*[\w\-@?^=%&/~+#])?/gu;

		const msgStyle = `color:${textColor};-webkit-text-stroke-color:${strokeColor}`;
		let lastIndex = 0;
		let hasUrl = false;
		for (const match of processedMessage.matchAll(urlRegex)) {
			hasUrl = true;
			if (match.index > lastIndex) {
				content.append(
					$('<span class="msg-text"></span>')
						.text(processedMessage.substring(lastIndex, match.index))
						.attr('style', msgStyle)
				);
			}
			content.append(
				$('<a class="msg-text" target="_blank" rel="noopener"></a>')
					.attr('href', match[0])
					.text(match[0])
					.attr('style', msgStyle)
			);
			lastIndex = match.index + match[0].length;
		}
		const remainingText = hasUrl ? processedMessage.substring(lastIndex) : processedMessage;
		if (remainingText) {
			content.append(
				$('<span class="msg-text"></span>')
					.text(remainingText)
					.attr('style', msgStyle)
			);
		}

		chatMessage.append(content);

		// Mark message with chatMessageId for whistle hover
		if (from.some(id => !localPlayerIds.includes(id))) {
			chatMessage.addClass('reportable');
			if (reported) {
				chatMessage.addClass('reported');
				this._appendReportedWhistle(chatMessageId);
			}
		}

		// Prepend to chat body
		this.chatBody.prepend(chatMessage);
		chatMessage.css({ display: 'none', opacity: 0, position: 'relative', zIndex: this.nextZIndex++ });
		if (animateHeight) chatMessage.show(200); else chatMessage.show();
		if (animateFadeIn) chatMessage.animate({ opacity: 1 }, 200); else chatMessage.css({ opacity: 1 });

		// Color usernames
		this._updatePlayerDetails(from);
		if (addRecipients && to) this._updatePlayerDetails(to);

		// Click handlers on foreign usernames
		for (const fromUser of from) {
			if (!localPlayerIds.includes(fromUser))
				this._addChatLink(chatMessage, fromUser, usernameMap[fromUser]);

		}
		if (addRecipients && to) {
			for (const toUser of to) {
				if (!localPlayerIds.includes(toUser))
					this._addChatLink(chatMessage, toUser, usernameMap[toUser]);

			}
		}

	},

	_renderSystemMessage(involvedPlayerIds, involvedUsernameMap, message, animateHeight, animateFadeIn, localPlayerIds) {
		const chatMessage = $('<div class="chatMessage"></div>');
		const words = message.split(' ');

		// Accumulate consecutive plain text into a single span
		let textBuffer = '';
		/** Flush accumulated text buffer into a system-text span */
		const flushText = () => {
			if (textBuffer) {
				chatMessage.append($('<span class="system-text"></span>').text(textBuffer));
				textBuffer = '';
			}
		};

		for (let i = 0; i < words.length; i++) {
			const word = words[i];

			if (word === '') continue;

			if (word === '\u00A7') {
				flushText();
				chatMessage.append('<br>');
				continue;
			}

			if (word === '@' && involvedPlayerIds?.length) {
				flushText();
				const effectiveLocalIds = localPlayerIds || Users.getAllPlayerIds();
				for (let j = 0; j < involvedPlayerIds.length; j++) {
					const playerId = involvedPlayerIds[j];
					chatMessage.append(createUsernameSpan(playerId, involvedUsernameMap[playerId], effectiveLocalIds.includes(playerId)));

					if (j === involvedPlayerIds.length - 2) {
						flushText();
						chatMessage.append($('<span class="system-text"> and </span>'));
					} else if (j < involvedPlayerIds.length - 2) {
						flushText();
						chatMessage.append($('<span class="system-text">, </span>'));
					} else {
						textBuffer += ' ';
					}
				}
				continue;
			}

			if (word.charAt(0) === '[' && word.includes('|')) {
				const variations = word.split('|');
				const selected = involvedPlayerIds?.length === 1
					? variations[0].substring(1)
					: variations[1].substring(0, variations[1].length - 1);
				textBuffer += `${selected} `;
				continue;
			}

			textBuffer += `${word} `;
		}
		flushText();

		// Click handlers for foreign involved players
		const sysEffectiveLocalIds = localPlayerIds || Users.getAllPlayerIds();
		if (involvedPlayerIds) {
			for (const playerId of involvedPlayerIds) {
				if (!sysEffectiveLocalIds.includes(playerId))
					this._addChatLink(chatMessage, playerId, involvedUsernameMap[playerId]);


			}
		}

		this.chatBody.prepend(chatMessage);
		chatMessage.css({ display: 'none', opacity: 0, position: 'relative', zIndex: this.nextZIndex++ });
		if (animateHeight) chatMessage.show(200); else chatMessage.show();
		if (animateFadeIn) chatMessage.animate({ opacity: 1 }, 200); else chatMessage.css({ opacity: 1 });

		if (involvedPlayerIds)
			this._updatePlayerDetails(involvedPlayerIds);

	},

	/**
	 * Add click handler to username spans for whispering
	 * @param {JQuery} chatMessage Message container
	 * @param {string} playerId Player ID
	 * @param {string} username Player username
	 */
	_addChatLink(chatMessage, playerId, username) {
		const chatUser = chatMessage.find(`.username[data-player-id="${playerId}"]`);
		chatUser.click(event => {
			if (Users.getHighestGmLevel() >= UIConstants.ADMIN_LEVEL_PLAYER_LOOKUP && event.shiftKey) {
				OverlayManager.pushOverlay(TankTrouble.AdminPlayerLookupOverlay, {
					adminId: Users.getHighestGmUser(),
					playerId
				});
				return;
			}
			if (!this.chatInput.prop('disabled'))
				this.addRecipient(playerId);

		});
		chatUser.tooltipster({ content: `Whisper to ${username}`, position: 'bottom' });
	},

	/**
	 * Update username colors from player details
	 * @param {string[]} playerIds Player IDs to update
	 */
	_updatePlayerDetails(playerIds) {
		for (const playerId of playerIds) {
			Backend.getInstance().getPlayerDetails(
				result => {
					if (typeof result === 'object') {
						let baseColour = result.getBaseColour().numericValue;
						baseColour = baseColour.substr(2);
						baseColour = `#${ baseColour.padStart(6, '0') }`;

						const baseRed = parseInt(baseColour.substr(1, 2), 16);
						const baseGreen = parseInt(baseColour.substr(3, 2), 16);
						const baseBlue = parseInt(baseColour.substr(5, 2), 16);
						const brightness = 0.299 * baseRed + 0.587 * baseGreen + 0.114 * baseBlue;
						const strokeColour = brightness >= 145.0 ? '#333333' : '#ffffff';

						$(`.username[data-player-id="${playerId}"]`)
							.css('color', baseColour)
							.css('--username-stroke', strokeColour);
					}
				},
				() => {}, () => {},
				playerId,
				Caches.getPlayerDetailsCache()
			);
		}
	},
	_sendChat(message) {
		if (message !== '') {
			// ISO-8859-15 validation
			try {
				decode(message, { mode: 'fatal' });
			} catch {
				Utils.updateTooltip(this.chatInput, 'Failed to send chat');
				setTimeout(() => Utils.updateTooltip(this.chatInput, ''), 1_500);
				return;
			}

			AudioManager.playSound(this.chatSendAudio);
			this.chat.addClass('send');
			this._updateInputBackground(true);
			this.blur();
			this.chatInput.prop('disabled', true);
			if (this.globalMessage)
				this._notifyEventListeners(TankTrouble.ChatBox.EVENTS.GLOBAL_CHAT, message);
			else if (this.recipientPlayerIds.length > 0)
				this._notifyEventListeners(TankTrouble.ChatBox.EVENTS.USER_CHAT, { recipientPlayerIds: this.recipientPlayerIds, message });
			else
				this._notifyEventListeners(TankTrouble.ChatBox.EVENTS.CHAT, message);

		} else {
			this.blur();
		}
	},

	_updateStatusMessageAndAvailability(originalMessageText, guestPlayerIds) {
		// Better welcome message
		let systemMessageText = originalMessageText;
		if (originalMessageText === 'Welcome to TankTrouble Comms \u00A7 \u00A7 ') {
			const newServer = ClientManager.getAvailableServers()[ClientManager.multiplayerServerId];
			systemMessageText = `Connected to ${ newServer.name } ${ guestPlayerIds.length ? '\u00A7 ' : '' }`;
		}

		const playerIds = Users.getAllPlayerIds();
		if (playerIds.length === 0) {
			this.chatInput.attr('placeholder', 'Join to transmit');
			this.chatInput.val('');
			this.chatInput.outerHeight(16);
			this.chatInput.prop('disabled', true);
			this._parseChat();
			if (systemMessageText !== '')
				this.addSystemMessage([], systemMessageText);

		} else {
			const authenticatedPlayerIds = Users.getAuthenticatedPlayerIds();
			if (authenticatedPlayerIds.length > 0) {
				const mpAuthenticatedPlayerIds = ClientManager.getClient().getAuthenticatedPlayerIds();
				if (mpAuthenticatedPlayerIds.length > 0 && ArrayUtils.containsSome(mpAuthenticatedPlayerIds, authenticatedPlayerIds)) {
					this.chatInput.attr('placeholder', 'Message');
					this.chatInput.prop('disabled', this.chat.hasClass('send'));
				} else {
					this.chatInput.attr('placeholder', 'Please wait');
					this.chatInput.val('');
					this.chatInput.outerHeight(16);
					this.chatInput.prop('disabled', true);
				}
			} else {
				this.chatInput.attr('placeholder', 'Sign up to transmit');
				this.chatInput.val('');
				this.chatInput.outerHeight(16);
				this.chatInput.prop('disabled', true);
				this._parseChat();
			}
			if (guestPlayerIds.length > 0)
				this.addSystemMessage(guestPlayerIds, `${ systemMessageText }@  must sign up to chat`);
			else if (systemMessageText !== '')
				this.addSystemMessage([], systemMessageText);

		}
	},

	_clearChat() {
		// Preserve chat across server changes
		const isUnconnected = ClientManager.getClient().getState() === TTClient.STATES.UNCONNECTED;
		if (isUnconnected) return;

		this.messages = [];
		this.chatBody.find('div.chatMessage').each(function() {
			$(this).stop(true).fadeOut(200, function() {
				$(this).remove();
			});
		});
		this.chat.find('.reported-whistle-wrapper').remove();
	},

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	_updateChat() {},

	_refreshChat(animate) {
		this.chat.find('.reported-whistle-wrapper').remove();
		this.chatBody.find('div.chatMessage').each(function() {
			if (animate) {
				$(this).stop(true).fadeOut(200, function() {
					$(this).remove();
				});
			} else {
				$(this).remove();
			}
		});

		if (animate)
			setTimeout(() => this._renderAllMessages(true), 200);
		else
			this._renderAllMessages(false);

	},

	_renderAllMessages(animateFadeIn) {
		for (const msg of this.messages) {
			if (msg.type === 'chat') {
				this._renderChatMessage(
					msg.from, msg.to, msg.usernameMap, msg.addRecipients,
					msg.textColor, msg.strokeColor, msg.message,
					msg.chatMessageId, msg.reported, false, animateFadeIn,
					msg.localPlayerIds
				);
			} else if (msg.type === 'system') {
				this._renderSystemMessage(
					msg.involvedPlayerIds, msg.involvedUsernameMap,
					msg.message, false, animateFadeIn,
					msg.localPlayerIds
				);
			}
		}
	},
	_initWhistle() {
		const whistle = $(`<img class="whistle" src="${g_url('assets/images/chat/report.png')}" srcset="${g_url('assets/images/chat/report@2x.png')} 2x" title=""/>`);
		whistle.tooltipster({ position: 'right', offsetX: 5 });
		whistle.hide();
		this.chat[0].appendChild(whistle[0]);
		this._whistle = whistle;
		this._whistleMessageId = null;

		const [chatBody] = this.chatBody;

		this._scrollSuppressed = false;

		$(chatBody).on('mouseenter', '.chatMessage.reportable', evt => {
			if (this._scrollSuppressed) return;

			const chatMessage = $(evt.currentTarget);
			const chatMessageId = this._getChatMessageId(chatMessage);
			if (chatMessageId === null) return;

			const msg = this.messages.find(
				item => item.type === 'chat' && item.chatMessageId === chatMessageId
			);
			if (!msg || msg.reported) return;

			const wasVisible = this._whistleMessageId !== null;
			this._whistleMessageId = chatMessageId;

			// Update tooltip
			const prettyUsernames = msg.from
				.filter(id => !Users.isAnyUser(id))
				.map(id => msg.usernameMap[id])
				.join(', ');
			whistle.tooltipster('content', `Report ${prettyUsernames}`);

			// Position next to the last line of the message
			const pos = this._getWhistlePosition(chatMessage[0]);
			whistle.css({
				left: `${pos.left}px`,
				top: `${pos.top}px`
			});

			clearTimeout(this._whistleHideTimer);
			whistle.stop();
			if (wasVisible)
				whistle.css('display', 'block').animate({ opacity: 1 }, 300);
			else
				whistle.css({ display: 'block', opacity: 0 }).animate({ opacity: 1 }, 210);

		});

		$(chatBody).on('mouseleave', '.chatMessage.reportable', evt => {
			if (whistle[0] === evt.relatedTarget || whistle[0].contains(evt.relatedTarget)) return;
			whistle.stop(true).fadeOut(210);
			this._whistleMessageId = null;
		});

		whistle.on('mouseleave', evt => {
			// If mouse went back to the message's ::after zone, don't hide
			const { relatedTarget } = evt;
			if (relatedTarget && $(relatedTarget).closest('.chatMessage.reportable', chatBody).length) return;
			whistle.stop(true).fadeOut(210);
			this._whistleMessageId = null;
		});

		whistle.on('click', () => {
			if (this._whistleMessageId === null) return;
			this._notifyEventListeners(TankTrouble.ChatBox.EVENTS.REPORT_CHAT, this._whistleMessageId);
		});

	},

	_getChatMessageId(chatMessage) {
		const classList = chatMessage[0].className;
		const match = classList.match(/message-(\d+)/u);
		return match ? Number(match[1]) : null;
	},

	_getWhistlePosition(msgEl) {
		const chatRect = this.chat[0].getBoundingClientRect();
		const contentEl = msgEl.querySelector('.chat-content') || msgEl;
		const { lastChild } = contentEl;
		const range = document.createRange();
		range.selectNodeContents(lastChild?.nodeType === Node.TEXT_NODE ? lastChild.parentNode : lastChild || contentEl);
		const lastLineRect = range.getClientRects();
		const endRect = lastLineRect[lastLineRect.length - 1] || msgEl.getBoundingClientRect();
		return {
			left: endRect.right - chatRect.left + 2,
			top: endRect.top - chatRect.top - 10
		};
	},

	_appendReportedWhistle(chatMessageId) {
		const wrapper = document.createElement('div');
		wrapper.className = 'reported-whistle-wrapper';
		wrapper.dataset.messageId = chatMessageId;
		const img = document.createElement('img');
		img.className = 'reported-whistle';
		img.src = g_url('assets/images/chat/reportSelected.png');
		img.srcset = `${g_url('assets/images/chat/reportSelected@2x.png')} 2x`;
		wrapper.appendChild(img);
		wrapper.addEventListener('click', () => {
			this._notifyEventListeners(TankTrouble.ChatBox.EVENTS.UNDO_CHAT_REPORT, chatMessageId);
		});
		this.chat[0].appendChild(wrapper);
		this._positionReportedWhistle(wrapper);
	},

	_positionReportedWhistle(wrapper) {
		const msgEl = this.chatBody[0].querySelector(`.message-${wrapper.dataset.messageId}`);
		if (!msgEl) {
			wrapper.style.display = 'none';
			return;
		}
		// Hide if message is outside the visible scroll area
		const bodyRect = this.chatBody[0].getBoundingClientRect();
		const msgRect = msgEl.getBoundingClientRect();
		if (msgRect.bottom < bodyRect.top || msgRect.top > bodyRect.bottom) {
			wrapper.style.display = 'none';
			return;
		}
		const pos = this._getWhistlePosition(msgEl);
		wrapper.style.display = '';
		wrapper.style.left = `${pos.left + 3}px`;
		wrapper.style.top = `${pos.top + 3}px`;
	},

	_repositionAllReportedWhistles() {
		this.chat[0].querySelectorAll('.reported-whistle-wrapper').forEach(wrapper => {
			this._positionReportedWhistle(wrapper);
		});
	},

	_updateWhistle(chatMessageId, reported) {
		const msg = this.messages.find(
			item => item.type === 'chat' && item.chatMessageId === chatMessageId
		);

		// Toggle reported class on the message element
		const msgEl = this.chatBody[0].querySelector(`.message-${chatMessageId}`);
		if (msgEl) msgEl.classList.toggle('reported', reported);

		// Toggle reported whistle outside .body
		const existing = this.chat[0].querySelector(`.reported-whistle-wrapper[data-message-id="${chatMessageId}"]`);
		if (reported && !existing) {
			this._appendReportedWhistle(chatMessageId);
		} else if (!reported && existing) {
			existing.remove();
		}

		// Update hover whistle visibility
		if (this._whistle) {
			if (reported) {
				this._whistle.stop(true).hide();
				this._whistleMessageId = null;
			} else if (msgEl) {
				$(msgEl).trigger('mouseenter');
			}
		}
	},

	_initScrollbar() {
		const scrollbar = document.createElement('div');
		scrollbar.className = 'chat-scrollbar';
		const thumb = document.createElement('div');
		thumb.className = 'chat-scrollbar-thumb';
		scrollbar.appendChild(thumb);
		this.chat[0].appendChild(scrollbar);
		this._scrollbar = scrollbar;
		this._scrollbarThumb = thumb;
		this._dragging = false;

		const [chatBody] = this.chatBody;
		let dragOffsetY = 0;

		thumb.addEventListener('mousedown', evt => {
			this._dragging = true;
			dragOffsetY = evt.clientY - thumb.getBoundingClientRect().top;
			thumb.classList.add('dragging');
			evt.preventDefault();
		});

		addEventListener('mousemove', evt => {
			if (!this._dragging) return;
			const scrollbarRect = scrollbar.getBoundingClientRect();
			const thumbHeight = thumb.offsetHeight;
			const trackHeight = scrollbarRect.height - thumbHeight;
			if (trackHeight <= 0) return;

			const thumbTop = Math.max(0, Math.min(evt.clientY - scrollbarRect.top - dragOffsetY, trackHeight));
			const scrollRatio = thumbTop / trackHeight;
			chatBody.scrollTop = scrollRatio * (chatBody.scrollHeight - chatBody.clientHeight);
		});

		addEventListener('mouseup', () => {
			if (!this._dragging) return;
			this._dragging = false;
			thumb.classList.remove('dragging');
		});

		let scrollEndTimer;
		chatBody.addEventListener('scroll', () => {
			this._updateScrollbarThumb();
			this._repositionAllReportedWhistles();
			if (this._whistleMessageId !== null) {
				this._whistle.stop(true).hide();
				this._whistleMessageId = null;
			}
			this._scrollSuppressed = true;
			clearTimeout(scrollEndTimer);
			scrollEndTimer = setTimeout(() => { this._scrollSuppressed = false; }, 150);
		}, { passive: true });
		new ResizeObserver(() => {
			this._updateScrollbarThumb();
			this._repositionAllReportedWhistles();
		}).observe(chatBody);
		new MutationObserver(mutations => {
			const relevant = mutations.some(mutation =>
				mutation.type === 'childList' || mutation.target.classList.contains('chatMessage')
			);
			if (relevant) {
				this._updateScrollbarThumb();
				this._repositionAllReportedWhistles();
			}
		}).observe(chatBody, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
	},

	_updateScrollbarThumb() {
		const [chatBody] = this.chatBody;
		const { scrollTop, scrollHeight, clientHeight } = chatBody;
		if (scrollHeight <= clientHeight) {
			this._scrollbar.style.display = 'none';
			return;
		}
		this._scrollbar.style.display = '';

		if (!this._dragging) {
			this._scrollbar.style.left = `${chatBody.offsetLeft - 12}px`;
			this._scrollbar.style.top = `${chatBody.offsetTop}px`;
			this._scrollbar.style.height = `${clientHeight}px`;
		}

		const thumbHeight = Math.max(20, (clientHeight / scrollHeight) * clientHeight);
		const maxScroll = scrollHeight - clientHeight;
		const thumbTop = (scrollTop / maxScroll) * (clientHeight - thumbHeight);
		this._scrollbarThumb.style.height = `${thumbHeight}px`;
		this._scrollbarThumb.style.top = `${thumbTop}px`;
	},
	_syncFormWidth() {
		const [chatBody] = this.chatBody;
		const bodyWidth = Number(chatBody.offsetWidth || 220);
		this.chatContent[0].style.setProperty('width', `${bodyWidth + 14}px`, 'important');
		this.chatInput[0].style.setProperty('width', `${bodyWidth - 8}px`, 'important');
	},

	_clearFormWidth() {
		this.chatContent[0].style.removeProperty('width');
		this.chatInput[0].style.removeProperty('width');
	}
};
whenContentInitialized().then(() => {
	const chatBox = TankTrouble.ChatBox;
	const [chatBody] = chatBox.chatBody;
	const [chatInput] = chatBox.chatInput;

	// Save native methods we want to preserve
	const preserved = {};
	const preserveList = [
		'_clientEventHandler', '_clientStateHandler', '_authenticationEventHandler',
		'_resizeEventHandler', '_handleChatSendReceipt', '_updateInputBackground',
		'_notifyNewMessage', '_removeLocalPlayersFromIgnored',
		'_notifyEventListeners', '_parseChat', '_lookUpUsernamesAndAddChatMessage',
		'_updateMessageReported'
	];
	for (const name of preserveList)
		preserved[name] = chatBox[name];
	// Override with addon methods
	Object.assign(chatBox, addonMethods);

	// Restore preserved native methods
	for (const [name, fn] of Object.entries(preserved))
		chatBox[name] = fn;
	// Increase max messages
	UIConstants.CHAT_BOX_MAX_NUM_MESSAGES = 200;

	// Prevent draggable from capturing scroll events on chat body and scrollbar
	chatBox.chat.draggable('option', 'cancel', 'input, textarea, button, select, option, .body, .chat-scrollbar');

	// Move resize handle outside .body to avoid fade mask
	const $handle = chatBox.chatBodyResizeHandle;
	chatBox.chat[0].appendChild($handle[0]);

	/** Sync handle position to the inside bottom-right corner of .body */
	const syncHandle = () => {
		const [handle] = $handle;
		if (!handle.offsetWidth) return;
		handle.style.left = `${chatBody.offsetLeft + chatBody.offsetWidth - handle.offsetWidth}px`;
		handle.style.top = `${chatBody.offsetTop + chatBody.offsetHeight - handle.offsetHeight}px`;
	};

	/** Fade in the resize handle, syncing position first */
	$handle.show = () => {
		if (!chatBox.chat.hasClass('open') && !chatBox.chat.hasClass('opening')) return $handle;
		$handle.stop(true).css({ display: '', opacity: 0 });
		syncHandle();
		return $handle.animate({ opacity: 1 }, 200);
	};
	/** Fade out and hide the resize handle */
	$handle.hide = () => $handle.stop(true).animate({ opacity: 0 }, 200, function() { $(this).css('display', 'none'); });

	new ResizeObserver(syncHandle).observe(chatBody);
	new MutationObserver(syncHandle).observe(chatBody, { attributes: true, attributeFilter: ['style'] });

	// Initialize scrollbar and whistle
	chatBox._initScrollbar();
	chatBox._initWhistle();

	// Setup autocomplete
	setupAutocomplete(chatInput);

	// Tooltipster on chat input for error messages
	chatBox.chatInput.tooltipster({
		position: 'right',
		theme: 'tooltipster-error',
		offsetX: 5,
		trigger: 'custom'
	});

	// Allow more characters
	chatInput.setAttribute('maxlength', '255');

	// Contain text selection within chat body
	chatBody.addEventListener('mousedown', evt => {
		if (evt.button !== 0) return;
		document.body.style.setProperty('user-select', 'none', 'important');
		document.body.style.setProperty('-webkit-user-select', 'none', 'important');
		/** Re-enable text selection on the page */
		const onMouseUp = () => {
			document.body.style.removeProperty('user-select');
			document.body.style.removeProperty('-webkit-user-select');
			document.removeEventListener('mouseup', onMouseUp);
		};
		document.addEventListener('mouseup', onMouseUp);
	});

	// Form width sync on body resize
	new MutationObserver(() => {
		if (chatBox.chat.hasClass('open') || chatBox.chat.hasClass('opening'))
			chatBox._syncFormWidth();

		chatInput.dispatchEvent(new InputEvent('input'));
	}).observe(chatBody, {
		attributes: true,
		characterData: false
	});

});

export const _isESmodule = true;
