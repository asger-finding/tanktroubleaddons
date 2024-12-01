import ProxyHelper from '../utils/proxyHelper.js';

/**
 * @typedef {object} ChatLogMessage
 * @property {number} messageId Unique message id
 * @property {number} messageIndex Index of message in the user's chatlog directory
 * @property {typeof MESSAGE_TYPES} type Message type
 * @property {number} created Message created time (epoch timestamp in sec)
 * @property {string[]} senders Message sender playerIds
 * @property {string[]} recipients Message recipients playerIds (if any; only if is user message)
 * @property {string} serverName Server id
 * @property {string} gameId Game id
 * @property {string} message Message content
 */

/**
 * @typedef {object} ChatLogCacheQuery
 * @property {number?} timestamp Filtering: Exact message timestamp
 * @property {number?} messageId Filtering: Message id
 * @property {number?} messageIndex Filtering: Message index
 * @property {string} sender Filtering: playerId of the primary sender
 * @property {string[]} types Filtering: message types
 * @property {number} limit Amount of messages
 */

/**
 * @typedef {((message: ChatLogMessage) => boolean)} ChatLogFilter
 * Function that evalues a ChatLogMessage and returns true or false
 * depending on whether it should be included
 */

/**
 * Enum for message types
 * @readonly
 * @enum {string}
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const MESSAGE_TYPES = {
	LOCAL: 'local',
	USER: 'user',
	GLOBAL: 'global'
};

/**
 * Enum for chat log filters
 * @readonly
 * @enum {string}
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const FILTERS = {
	...MESSAGE_TYPES,
	ALL: 'all',
	IN_GAME_ONLY: 'in-game-only',
	MULTIPLE_SENDERS: 'multiple-users'
};

const dbName = 'addons';
const storeName = 'chatlogCache';

/**
 * Open a new chat log message cache
 * @returns {Promise<IDBDatabase>} Promise with database
 */
const openMessagesDatabase = () => new Promise((resolve, reject) => {
	const request = indexedDB.open(dbName, 1);

	/* eslint-disable jsdoc/require-jsdoc */
	request.onupgradeneeded = (event) => {
		const db = event.target.result;
		const store = db.createObjectStore(storeName, { keyPath: 'messageId' });

		store.createIndex('created', 'created');
		store.createIndex('messageId', 'messageId');
		store.createIndex('messageIndex', 'messageIndex');
		store.createIndex('senders', 'senders', { multiEntry: true });
		store.createIndex('type', 'type');
	};

	request.onsuccess = (event) => resolve(event.target.result);
	request.onerror = (event) => reject(event.target.error);
	/* eslint-enable jsdoc/require-jsdoc */
});

/**
 * Add chat log item to database
 * @param {IDBDatabase} db Database object
 * @param {ChatLogMessage} chatMessage Chat log message item
 * @returns {Promise<void>} Promise when done
 */
const addMessage = (db, chatMessage) => new Promise(resolve => {
	const transaction = db.transaction([storeName], 'readwrite');
	const store = transaction.objectStore(storeName);
	const request = store.add(chatMessage);

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = () => resolve();

	// Likely, the error is for if the item
	// already exists in the IndexedDB store.
	// In that case, we ignore and carry on.
	request.onerror = () => resolve();
	/* eslint-enable jsdoc/require-jsdoc */
});

/**
 * Chunk series of numbers in an array into an object data structure
 * that defines the start number of the chunk and its length
 * @param {number[]} array Array to chunk
 * @returns {Record<number, number>} Chunk object
 */
const chunk = array => {
	const result = new Map();
	let [start] = array;
	let length = 1;

	for (let i = 1; i <= array.length; i++) {
		if (array[i] === array[i - 1] + 1) {
			length++;
		} else {
			result.set(start, length);
			start = array[i];
			length = 1;
		}
	}

	return result;
};

/**
 * Make chat.getChatMessagesByPlayerIds request
 *
 * Mimics TankTrouble.Ajax.getChatMessagesByPlayerIds
 * @param {string} adminId Admin playerId
 * @param {string[]} playerIds playerIds
 * @param {number} offset Chat messages offset
 * @param {number} limit Amount of messages
 * @returns {object | null} Data or null
 */
const makeServerRequest = (adminId, playerIds, offset, limit) => fetch($.jsonRPC.endPoint, {
	method: 'POST',
	body: JSON.stringify({
		id: 1,
		jsonrpc: '2.0',
		method: `${ $.jsonRPC.namespace }.chat.getChatMessagesByPlayerIds`,
		params: [adminId, playerIds, offset, limit]
	})
}).then(buffer => buffer.json()).then(json => json.result.result ? json.result.data : null);

/**
 * Request chat log, transform and cache
 * @param {string} adminId Admin playerId
 * @param {string} playerId playerId to match against
 * @param {number} offset Offset/shift in their list of chat messages to get messages by
 * @param {number} limit Amount of messages
 * @param {IDBDatabase} cacheDb IndexedDB database to cache to
 * @returns {ChatLogMessage[]} List of transformed chat messages
 */
const requestAndCache = async(adminId, playerId, offset, limit, cacheDb) => {
	const messageList = await makeServerRequest(adminId, [playerId], offset, limit);
	if (messageList === null) return [];

	const { chatMessages, count: total } = messageList;
	return chatMessages.map((chatMessage, index) => {
		const { id: messageId, created, senders, recipients, serverName, gameId, message } = chatMessage;

		// We can determine the message number from
		// the message total and index of the message
		const messageIndex = total - index - offset - 1;

		let type = MESSAGE_TYPES.LOCAL;
		if (chatMessage.globalChat) type = MESSAGE_TYPES.GLOBAL;
		else if (chatMessage.recipients.length) type = MESSAGE_TYPES.USER;

		// We only include the static data
		// chatMessage["html"] is SSR code that
		// includes that are state-dependent
		// and shouldn't be cached.
		/** @type {ChatLogMessage} */
		const dbMessage = { messageId, messageIndex, type, created, senders, recipients, serverName, gameId, message };

		addMessage(cacheDb, dbMessage);

		return dbMessage;
	});
};

/**
 * Check the cache map for gaps in message indices
 * @param {IDBDatabase} db Database object
 * @param {number} messageIndex Message index to start search on
 * @param {string} playerId Player identifier
 * @param {number} offset Offset of first message
 * @param {number} limit Amount of messages
 * @returns {[ChatLogMessage[], Record<number, number>]} Gaps map with their absolute offset
 */
const findCacheGaps = (db, messageIndex, playerId, offset, limit) => new Promise((resolve, reject) => {
	const transaction = db.transaction([storeName], 'readonly');
	const store = transaction.objectStore(storeName);

	const index = store.index('messageIndex');
	const range = IDBKeyRange.upperBound(messageIndex, true);

	const request = index.openCursor(range, 'prev');

	const indicesRange = new Set([ ...Array(limit).keys() ].map((_n, i) => messageIndex - i - 1));
	const cacheRange = new Set();
	const matches = [];
	const bottom = messageIndex - limit;

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = async event => {
		const cursor = event.target.result;

		if (cursor && !cursor.value.senders.includes(playerId)) {
			cursor.continue();
			return;
		}

		if (cursor && cursor.value.messageIndex >= bottom) {
			cacheRange.add(cursor.value.messageIndex);
			matches.push(cursor.value);
			cursor.continue();
		} else {
			const indicesFoundInRange = new Set([ ...cacheRange ].filter(num => num < messageIndex && num > messageIndex - limit - 1));
			const uncached = [ ...indicesRange.difference(indicesFoundInRange) ]
				.map(uncachedMessageIndex => messageIndex - uncachedMessageIndex - 1 + offset);
			const digestible = [ ...chunk(uncached).entries() ];

			resolve([matches, digestible]);
		}
	};
	request.onerror = event => reject(event.target.error);
	/* eslint-enable jsdoc/require-jsdoc */
});

/**
 * Get the chat message count total of a player
 * @param {string} adminId Admin playerId
 * @param {string} playerId Target playerId
 * @returns {Promise<number>} Total messages sent
 */
const getChatTotal = (adminId, playerId) => makeServerRequest(adminId, [playerId], 0, 1).then(({ count }) => Number(count));

/**
 * Get chat messages by playerIds.
 * @param {string} adminId Admin playerId
 * @param {string} playerId playerId to match against
 * @param {number} offset Offset/shift in their list of chat messages to get messages by
 * @param {number} limit Amount of messages
 * @param {IDBDatabase} cacheDb IndexedDB database to cache to
 * @returns {Promise<object[]>} Chat message data
 */
const getChatMessagesByPlayerId = async(adminId, playerId, offset, limit, cacheDb) => {
	const total = await getChatTotal(adminId, playerId);
	const firstMessageIndex = total - offset;
	const [cached, gaps] = await findCacheGaps(cacheDb, firstMessageIndex, playerId, offset, limit);

	const missing = gaps.flatMap(([gapOffset, gapLimit]) => requestAndCache(adminId, playerId, gapOffset, gapLimit, cacheDb));
	const fetched = await Promise.all(missing);

	const messages = [ ...cached, ...fetched ].flat()
		.sort((first, sec) => first.messageIndex - sec.messageIndex);

	return messages;
};

/**
 * Generator function to fetch chat messages by playerIds with a filter for message type.
 * @param {string} adminId Admin playerId
 * @param {string} playerId playerId to match against
 * @param {number} offset Offset in the chat messages list to start from
 * @param {number} limit Amount of messages to fetch
 * @param {IDBDatabase} cacheDb IndexedDB database to cache to
 * @param {(ChatLogMessage) => boolean} filter Type of message to filter by (e.g., MESSAGE_TYPES.GLOBAL)
 * @param {AbortSignal} abortSignal Signal if we need to drop process early
 * @param {number?} fetchLimit How many messages to fetch at once
 * @returns {AsyncGenerator<ChatLogMessage[], void, unknown>} Generator yielding batches of chat messages
 * @yields Chat logs that match filter
 */
// eslint-disable-next-line max-params
async function* fetchFilteredChatMessages(
	adminId,
	playerId,
	offset,
	limit,
	cacheDb,
	filter,
	abortSignal = new AbortController().signal,
	fetchLimit = limit
) {
	let currentOffset = offset;
	let totalFetched = 0;

	while (totalFetched < limit) {
		if (abortSignal.aborted) break;

		// Fetch messages in batches
		// eslint-disable-next-line no-await-in-loop
		const messagesBatch = await getChatMessagesByPlayerId(adminId, playerId, currentOffset, fetchLimit, cacheDb);

		if (!messagesBatch.length) break;

		// Filter the current batch based on the provided filter function
		const filteredBatch = messagesBatch.filter(filter);

		// If we have filtered messages, yield them immediately for progressive rendering
		if (filteredBatch.length) {
			yield filteredBatch.slice(0, limit - totalFetched);
			totalFetched += filteredBatch.length;
		}

		// Update the offset for the next request
		currentOffset += messagesBatch.length;
	}
}

TankTrouble.AdminChatLogOverlay._getChatMessagesByTimeAndReplaceStatic = function(id, created, serverName, gameId) {
	const clickedChatMessageId = `chatMessage-${ serverName }${ gameId ? `-${ gameId }` : ''}-${ id }`;
	const pointer = $('<div/>');
	const disabled = this.chatMessages.find(`#${ clickedChatMessageId } > button`).prop('disabled', true);
	this.chatMessages.find(`#${ clickedChatMessageId }`).after(pointer);

	// eslint-disable-next-line complexity
	Backend.getInstance().getChatMessagesByTime(result => {
		if (typeof(result) == 'object') {
			for (let i = 0; i < result.length; i++) {
				const chatMessageData = result[i];
				const chatMessageId = `chatMessage-${ serverName }${ gameId ? `-${ gameId }` : '' }-${ chatMessageData.id }`;
				let chatMessage = this.chatMessages.find(`#${ chatMessageId }`);

				const replaceStaticMessage = Boolean(chatMessage.length) && chatMessage.hasClass('static');

				if (replaceStaticMessage) {
					chatMessage.remove();
					chatMessage = this._createChatMessage(chatMessageData, serverName, gameId);
				} else if (chatMessage.length === 0) {
					chatMessage = this._createChatMessage(chatMessageData, serverName, gameId);
				}

				if (chatMessageId === clickedChatMessageId) {
					if (i === 0) chatMessage.data('first', true);
					if (i === result.length - 1) chatMessage.data('last', true);
				}

				if (i > 0 || i < result.length - 1) chatMessage.data('expanded', true);

				pointer.before(chatMessage);
			}

			pointer.remove();

			this._updateButtonsAndDividers();
		} else {
			this._handleError(result);
			disabled.prop('disabled', false);
		}
	}, (result) => {
		this._handleError(result);
		disabled.prop('disabled', false);
	}, null, this.adminId, created - 60, created + 60, serverName, gameId);
};

/**
 * Render a chatlog object to a HTMLElement
 * @param {ChatLogMessage} chatMessage Message content
 * @param {string} adminId Admin playerId
 * @returns {Promise<HTMLDivElement>} Chatlog element
 */
const renderChatMessage = async(chatMessage, adminId) => {
	const { serverName, gameId } = chatMessage;

	const wrapper = document.createElement('div');
	wrapper.classList.add('chatMessage', 'listItem', 'static', 'first');
	wrapper.id = `chatMessage-${ serverName }${ gameId ? `-${ gameId }` : '' }-${ chatMessage.messageId }`;
	wrapper.dataset.id = chatMessage.messageId;
	wrapper.dataset.serverName = serverName;
	wrapper.dataset.gameId = gameId;

	const expandButton = document.createElement('button');
	expandButton.classList.add('expand', 'small');
	expandButton.type = 'button';
	expandButton.tabIndex = '-1';
	expandButton.innerText = '+';

	expandButton.addEventListener('click', () => {
		TankTrouble.AdminChatLogOverlay._getChatMessagesByTimeAndReplaceStatic(chatMessage.messageId, chatMessage.created, serverName, gameId);
	});

	const details = document.createElement('div');
	details.classList.add('details');

	const time = document.createElement('span');
	time.classList.add('time');
	time.innerText = new Date(chatMessage.created * 1000)
		.toISOString()
		.slice(0, -8)
		.replace(/[TtZz]/gu, ' ');

	const server = document.createTextNode(`${ serverName } `);

	const senders = await new Promise(resolve => {
		if (!chatMessage.senders.length) {
			resolve(document.createElement('span'));
			return;
		}

		AdminUtils.createPlayerNamesWithLookupByPlayerIds(chatMessage.senders, adminId, result => {
			resolve(result[0]);
		});
	});

	const directedToIcon = document.createTextNode('');
	const recipients = await new Promise(resolve => {
		if (!chatMessage.recipients.length) {
			resolve(document.createElement('span'));
			return;
		}

		AdminUtils.createPlayerNamesWithLookupByPlayerIds(chatMessage.recipients, adminId, result => {
			if (chatMessage.recipients.length) directedToIcon.textContent = ' @ ';

			resolve(result[0]);
		});
	});

	const colon = document.createTextNode(': ');

	const message = document.createElement('span');
	message.classList.add('message');
	message.innerText = chatMessage.message;

	if (chatMessage.type === MESSAGE_TYPES.GLOBAL) message.classList.add('global');
	else if (chatMessage.type === MESSAGE_TYPES.USER) message.classList.add('private');

	details.append(time, server, senders, directedToIcon, recipients, colon, message);
	wrapper.append(expandButton, details);

	return wrapper;
};

/**
 * Filter message from user selection. Render to chat log, then return array of filtered messages
 * @param {number} offset Chat log index offset
 * @param {number} limit Amount of messages to render
 * @param {typeof FILTERS} filter Filter identitifier
 * @returns {Promise<chatMessage[]>} Array of filtered chat messages
 */
// eslint-disable-next-line complexity
TankTrouble.AdminChatLogOverlay.filterAndRenderMessages = async function(offset, limit, filter) {
	this.wrapper.find(':not(.navigation):not(.paginator) button, .paginator button').prop('disabled', true);
	this.chatMessages.empty();

	const loadingMessage = $('<div class="subHeader"><span class="ui-icon ui-icon-alert"></span>Loading messages . . .</div>')
		.css('display', 'inline-block')
		.insertAfter(this.messageTypeFilter);

	/** @type {ChatLogFilter} */
	let messageFilter = () => true;

	switch (filter) {
		case FILTERS.LOCAL:
			/** @type {ChatLogFilter} */
			messageFilter = ({ type }) => type === MESSAGE_TYPES.LOCAL;
			break;
		case FILTERS.GLOBAL:
			/** @type {ChatLogFilter} */
			messageFilter = ({ type }) => type === MESSAGE_TYPES.GLOBAL;
			break;
		case FILTERS.USER:
			/** @type {ChatLogFilter} */
			messageFilter = ({ type }) => type === MESSAGE_TYPES.USER;
			break;
		case FILTERS.IN_GAME_ONLY:
			/** @type {ChatLogFilter} */
			messageFilter = ({ gameId }) => gameId !== null;
			break;
		case FILTERS.MULTIPLE_SENDERS:
			/** @type {ChatLogFilter} */
			messageFilter = ({ senders }) => senders.length > 1;
			break;
		case FILTERS.ALL:
		default:
			throw new Error('TankTrouble.AdminChatLogOverlay.filterAndRenderMessages was not provided a valid filter');
	}

	const [playerId] = this.playerIds;

	const messageGenerator = fetchFilteredChatMessages(
		this.adminId,
		playerId,
		offset,
		limit,
		Addons.chatlogDb,
		messageFilter
	);

	const messages = [];
	for await (const incomingMessages of messageGenerator) {
		// Render each batch of new messages as they arrive
		Promise.all(incomingMessages.reverse().map(newMessage => {
			messages.push(newMessage);

			return renderChatMessage(newMessage, this.adminId);
		})).then(messageElements => this.chatMessages.append(...messageElements));
	}

	loadingMessage.remove();
	this._updateButtonsAndDividers();

	return messages;
};

/**
 * Create a paginator which can offset by a variable amount instead of fixed
 * @param {number?} lastOffset Offset to last page (if any)
 * @param {number} nextOffset Offset to next page
 * @param {number} pageIndex Index of current page
 * @param {number} limit Limit to callback
 * @param {(newOffset: number, newLimit: number, newPage: number) => void} callback Callback function
 * @returns {JQuery} Paginator element
 */
const createVariablePaginator = (lastOffset, nextOffset, pageIndex, limit, callback) => {
	const pageName = pageIndex + 1;
	const paginator = $('<div class="paginator"/>');

	if (lastOffset !== null) {
		$(`<button class='small' type='button' data-page='${ pageIndex - 1 }' tabindex='-1'>${ pageName - 1 }</div>`)
			.appendTo(paginator)
			.on('click', () => {
				callback(lastOffset, limit, pageIndex - 1);
			});
	}

	$(`<button class='small' type='button' data-page='${ pageIndex }' tabindex='-1' disabled="true">${ pageName }</div>`)
		.appendTo(paginator);

	if (nextOffset !== null) {
		$(`<button class='small' type='button' data-page='${ pageIndex + 1 }' tabindex='-1'>${ pageName + 1 }</div>`)
			.appendTo(paginator)
			.on('click', () => {
				callback(nextOffset, limit, pageIndex + 1);
			});
	}

	$('<div class="subHeader">. . .</div>')
		.appendTo(paginator)
		.css({
			marginLeft: '10px',
			display: 'inline-block',
			verticalAlign: 'text-top'
		});

	return paginator;
};

/**
 *
 * @param {string} adminId Admin playerId
 * @param {string} playerId playerId to look up
 * @param {IDBDatabase} cacheDb Chat log database
 * @param {AbortController} abortSignal Event if process should abort
 * @param {(playerId: string) => void} newPlayerIdCallback Callback for new unique player id
 * @returns {Promise<string[]>} playerId result array
 */
const makeAltLookup = async(adminId, playerId, cacheDb, abortSignal, newPlayerIdCallback) => {
	const total = await getChatTotal(adminId, playerId);
	const messageGenerator = fetchFilteredChatMessages(
		adminId,
		playerId,
		0,
		total,
		cacheDb,
		({ senders }) => senders.length > 1,
		abortSignal,
		1000
	);

	const uniques = new Set();
	for await (const incomingMessages of messageGenerator) {
		// Render each batch of new messages as they arrive
		incomingMessages.reverse().forEach(({ senders }) => {
			for (const sender of senders) {
				const before = uniques.size;
				uniques.add(sender);
				const after = uniques.size;

				if (after > before) newPlayerIdCallback(sender);
			}
		});
	}

	return Array.from(uniques);
};

openMessagesDatabase().then(async cacheDb => {
	Addons.chatlogDb = cacheDb;

	ProxyHelper.interceptFunction(TankTrouble.AdminChatLogOverlay, '_initialize', async(original, ...args) => {
		const overlay = TankTrouble.AdminChatLogOverlay;
		if (overlay.initialized) return;

		original(args);

		overlay.messageTypeFilter = $('<select name="filter" class="messagefilterselector"/>');
		overlay.messageTypeFilter.append(`<option value="${ FILTERS.ALL }">Show all</option>`);
		overlay.messageTypeFilter.append(`<option value="${ FILTERS.LOCAL }">Local chat</option>`);
		overlay.messageTypeFilter.append(`<option value="${ FILTERS.IN_GAME_ONLY }">Local sent in game</option>`);
		overlay.messageTypeFilter.append(`<option value="${ FILTERS.GLOBAL }">Global chat</option>`);
		overlay.messageTypeFilter.append(`<option value="${ FILTERS.USER }">User chat</option>`);
		overlay.messageTypeFilter.append(`<option value="${ FILTERS.MULTIPLE_SENDERS }">Multiple senders</option>`);

		overlay.messageTypeFilter.insertAfter(overlay.header);

		overlay.filteredPageIndices = new Map();

		overlay.messageTypeFilter.change(async() => {
			const topPaginator = $('<div></div>');
			overlay.topPaginator.replaceWith(topPaginator);
			overlay.topPaginator = topPaginator;

			const bottomPaginator = topPaginator.clone(true);
			overlay.bottomPaginator.replaceWith(bottomPaginator);
			overlay.bottomPaginator = bottomPaginator;

			overlay.filteredPageIndices.clear();
			overlay.filteredPageIndices.set(0, 0);
			overlay._getChatMessagesByPlayerIds(0, 50, 0, 0);
		});
	});

	// eslint-disable-next-line complexity
	ProxyHelper.interceptFunction(TankTrouble.AdminChatLogOverlay, '_getChatMessagesByPlayerIds', async(original, ...args) => {
		const overlay = TankTrouble.AdminChatLogOverlay;

		if (overlay.messageTypeFilter.val() === FILTERS.ALL) {
			original(...args);
		} else {
			const [offset, limit] = args;
			const page = args[2] ?? 0;

			const messages = await overlay.filterAndRenderMessages(offset, limit, overlay.messageTypeFilter.val(), page);
			const total = await getChatTotal(overlay.adminId, overlay.playerIds[0]);
			const firstMessage = messages.at(0);
			const lastMessage = messages.at(-1);

			if (!firstMessage) return;

			const offsetToLastPage = overlay.filteredPageIndices.get(page - 1) ?? null;
			const offsetToNextPage = messages.length < limit
				? null
				: total - lastMessage.messageIndex + 1;
			overlay.filteredPageIndices.set(page + 1, offsetToNextPage);

			const topPaginator = createVariablePaginator(offsetToLastPage, offsetToNextPage, page, limit, (newOffset, newLimit, newPage) => {
				overlay._getChatMessagesByPlayerIds(newOffset, newLimit, newPage);
			});
			overlay.topPaginator.replaceWith(topPaginator);
			overlay.topPaginator = topPaginator;

			const bottomPaginator = topPaginator.clone(true);
			overlay.bottomPaginator.replaceWith(bottomPaginator);
			overlay.bottomPaginator = bottomPaginator;
		}
	});

	ProxyHelper.interceptFunction(TankTrouble.AdminPlayerLookupOverlay, '_update', (original, ...args) => {
		const overlay = TankTrouble.AdminPlayerLookupOverlay;

		original(...args);

		ProxyHelper.interceptFunction(overlay.details, 'append', (scopedAppend, ...appendArgs) => {
			scopedAppend(...appendArgs);

			const chatlogButton = overlay.details.find('.section button:contains("Chat log")');

			// Admin has access to chat log
			if (chatlogButton.length) {
				const abort = new AbortController();

				const section = chatlogButton.parent();
				const adminAltLookupButton = $('<button class="small" type="button" tabindex="-1">Alternative accounts</button>');
				const fetchingIcon = $('<span class="ui-icon ui-icon-arrowthickstop-1-s"></span>').css('vertical-align', 'bottom');
				const altAccountDialog = $('<div></div>').dialog({
					autoOpen: false,
					minWidth: 600,
					width: 600,
					title: 'Loading alternative accounts . . .',

					/** Preprocessing */
					open() {
						$(this).append(fetchingIcon);
						$(this).parent().css('zIndex', 1001);
					},

					/** Signal for close */
					close() { abort.abort(); },

					buttons: [
						{
							text: 'Copy id + username',
							click() {
								const text = $(this)
									.children()
									.map(function() {
										const playerId = $(this).attr('data-id');
										if (typeof playerId === 'undefined') return null;

										return `${ playerId }: ${ $(this).text() }`;
									})
									.get();

								ClipboardManager.copy(text.join('\n'));
							}
						},
						{
							text: 'Copy usernames',
							click() {
								const text = this.innerText.trim().split(' ').join('\n');
								ClipboardManager.copy(text);
							}
						}
					]
				});

				adminAltLookupButton.on('mouseup', async() => {
					altAccountDialog.dialog('open');

					await makeAltLookup(
						overlay.adminId,
						overlay.playerId,
						Addons.chatlogDb,
						abort.signal,
						playerId => {
							AdminUtils.createPlayerNamesWithLookupByPlayerIds([playerId], overlay.adminId, username => {
								username.attr('data-id', playerId);
								fetchingIcon.before([username, ' ']);
							});
						}
					);

					fetchingIcon.remove();

					if (!abort.signal.aborted) altAccountDialog.dialog({ title: 'Loaded all chat history' });
				});

				section.append([adminAltLookupButton]);
			}
		});
	});
});

/**
 * Limit date range inputs so that they don't overlap negatively
 */
const limitDateRange = () => {
	const overlay = TankTrouble.AdminStatisticsOverlay;

	overlay.startDate.datepicker('option', 'maxDate', overlay.endDate.datepicker('getDate'));
	overlay.endDate.datepicker('option', 'minDate', overlay.startDate.datepicker('getDate'));
};

ProxyHelper.interceptFunction(TankTrouble.AdminStatisticsOverlay, '_initialize', (original, ...args) => {
	const overlay = TankTrouble.AdminStatisticsOverlay;

	if (overlay.initialized) return;

	original(...args);

	overlay.customRangeWrapper = $('<div></div>').css({ 'width': 'fit-content' });

	overlay.startDate = $('<input type="text">').datepicker({
		maxDate: 0,
		onSelect: overlay._getStatistics
	});
	overlay.endDate = $('<input type="text">').datepicker({
		maxDate: 0,
		onSelect: overlay._getStatistics
	});

	const startDateDefault = new Date();
	const endDateDefault = new Date();

	startDateDefault.setMonth(endDateDefault.getMonth() - 1);

	overlay.startDate.datepicker('setDate', startDateDefault);
	overlay.endDate.datepicker('setDate', endDateDefault);

	overlay.startDate.hide();
	overlay.endDate.hide();

	overlay.customRangeWrapper.append(['<hr></hr>', overlay.startDate, overlay.endDate]);
	overlay.period.append("<option value='custom'>Custom timerange</option>");
	overlay.period.after(overlay.customRangeWrapper);
});

ProxyHelper.interceptFunction(TankTrouble.AdminStatisticsOverlay, '_getStatistics', (original, ...args) => {
	const overlay = TankTrouble.AdminStatisticsOverlay;

	if (overlay.period.val() === 'custom') {
		limitDateRange();

		overlay.forumStatistics.html('<div class="subHeader">Loading...</div>');
		overlay.adminStatistics.empty();

		overlay.startDate.show();
		overlay.endDate.show();

		// Get min/max time
		const minTime = Math.floor(overlay.startDate.datepicker('getDate').getTime() / 1000);
		const maxTime = Math.floor(overlay.endDate.datepicker('getDate').getTime() / 1000);

		// Something went wrong ...
		if (minTime > maxTime) return;

		// Set html
		Backend.getInstance().getAdminStatistics(result => {
			if (typeof (result) == 'object') {
				overlay.forumStatistics.html(result.forumHtml);
				overlay.adminStatistics.html(result.adminHtml);
			} else {
				overlay._handleError(result);
			}
		}, (result) => {
			overlay._handleError(result);
		}, null, overlay.adminId, minTime, maxTime);
	} else {
		overlay.startDate.hide();
		overlay.endDate.hide();

		original(...args);
	}
});

export const _isESmodule = true;
