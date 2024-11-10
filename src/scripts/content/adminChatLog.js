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
	IN_GAME_ONLY: 'in-game-only'
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
const addMessage = (db, chatMessage) => new Promise((resolve, reject) => {
	const transaction = db.transaction([storeName], 'readwrite');
	const store = transaction.objectStore(storeName);
	const request = store.add(chatMessage);

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = () => resolve();
	request.onerror = event => reject(event.target.error);
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
 * @param {number} limit Limit of returned messages
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
 * @param {number} limit Limit of returned messages
 * @param {IDBDatabase} cacheDb IndexedDB database to cache to
 * @returns {ChatLogMessage[]} List of transformed chat messages
 */
const requestAndCache = async(adminId, playerId, offset, limit, cacheDb) => {
	const messageList = await makeServerRequest(adminId, [playerId], offset, limit);
	if (messageList === null) return [];

	const { chatMessages, count } = messageList;
	return chatMessages.map((chatMessage, index) => {
		const { id: messageId, created, senders, recipients, serverName, gameId, message } = chatMessage;

		// We can determine the message number from
		// the message count and index of the message
		const messageIndex = count - index - offset - 1;

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
 * @param {number} offset Offset of first message
 * @param {number} limit How far back to look for gaps
 * @returns {[ChatLogMessage[], Record<number, number>]} Gaps map with their absolute offset
 */
const findCacheGaps = (db, messageIndex, offset, limit) => new Promise((resolve, reject) => {
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
 * Get chat messages by playerIds.
 * @param {string} adminId Admin playerId
 * @param {string} playerId playerId to match against
 * @param {number} offset Offset/shift in their list of chat messages to get messages by
 * @param {number} limit Limit of returned messages
 * @param {IDBDatabase} cacheDb IndexedDB database to cache to
 * @returns {Promise<object[]>} Chat message data
 */
const getChatMessagesByPlayerId = async(adminId, playerId, offset, limit, cacheDb) => {
	const { count } = await makeServerRequest(adminId, [playerId], 0, 1);
	const firstMessageIndex = count - offset;
	const [cached, gaps] = await findCacheGaps(cacheDb, firstMessageIndex, offset, limit);

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
 * @param {number} limit Total number of messages to fetch
 * @param {IDBDatabase} cacheDb IndexedDB database to cache to
 * @param {string} filterType Type of message to filter by (e.g., MESSAGE_TYPES.GLOBAL)
 * @returns {AsyncGenerator<ChatLogMessage[], void, unknown>} Generator yielding batches of chat messages
 * @yields Chat logs that match filter
 */
// eslint-disable-next-line max-params
async function* fetchFilteredChatMessages(adminId, playerId, offset, limit, cacheDb, filterType) {
	const fetchedMessages = [];
	let currentOffset = offset;

	while (fetchedMessages.length < limit) {
		// eslint-disable-next-line no-await-in-loop
		const messagesBatch = await getChatMessagesByPlayerId(adminId, playerId, currentOffset, limit, cacheDb);

		if (!messagesBatch.length) break;

		const filteredBatch = messagesBatch.filter(msg => msg.type === filterType);

		// Add filtered messages to the result set
		fetchedMessages.push(...filteredBatch);

		// If we’ve met the limit, yield the result
		if (fetchedMessages.length >= limit) {
			yield fetchedMessages.slice(0, limit);
			return;
		}

		// Update the offset for the next batch
		currentOffset += messagesBatch.length;
	}

	// Yield remaining messages if fewer than limit
	yield fetchedMessages;
}

/**
 * Render a chatlog object to a HTMLElement
 * @param {ChatLogMessage} chatMessage Message content
 * @returns {HTMLDivElement} Chatlog element
 */
const renderChatMessage = chatMessage => {
	const { serverName, gameId } = chatMessage;

	const wrapper = document.createElement('div');
	wrapper.classList.add('chatMessage', 'listItem', 'first');
	wrapper.id = `chatMessage-${ serverName }${ gameId ? `-${ gameId }` : '' }-${ chatMessage.id }`;
	wrapper.dataset.id = chatMessage.id;
	wrapper.dataset.serverName = serverName;
	wrapper.dataset.gameId = gameId;

	const expandButton = document.createElement('button');
	expandButton.classList.add('expand', 'small');
	expandButton.type = 'button';
	expandButton.tabIndex = '-1';

	expandButton.addEventListener('click', () => {
		TankTrouble.AdminChatLogOverlay._getChatMessagesByTime(chatMessage.id, chatMessage.created, contextServerName, contextGameId);
	});

	wrapper.append(expandButton);

	return wrapper;
};

openMessagesDatabase().then(async cacheDb => {
	Addons.chatlogDb = cacheDb;

	ProxyHelper.interceptFunction(TankTrouble.AdminChatLogOverlay, '_initialize', async(original, ...args) => {
		const overlay = TankTrouble.AdminChatLogOverlay;
		if (overlay.initialized) return;

		original(args);

		overlay.messageTypeFilter = $('<select name="filter"/>');
		overlay.messageTypeFilter.append(`<option value="${ FILTERS.ALL }">Show all</option>`);
		overlay.messageTypeFilter.append(`<option value="${ FILTERS.LOCAL }">Local chat</option>`);
		overlay.messageTypeFilter.append(`<option value="${ FILTERS.IN_GAME_ONLY }">Local sent in game</option>`);
		overlay.messageTypeFilter.append(`<option value="${ FILTERS.GLOBAL }">Global chat</option>`);
		overlay.messageTypeFilter.append(`<option value="${ FILTERS.USER }">User chat</option>`);

		overlay.messageTypeFilter.insertAfter(overlay.header);

		let offset = 0;
		overlay.messageTypeFilter.change(async() => {
			const shift = offset;
			offset += 50;

			const adminId = '3162693';
			const playerId = '3162693';
			const limit = 50;

			const messageGenerator = fetchFilteredChatMessages(adminId, playerId, shift, limit, Addons.chatlogDb, overlay.messageTypeFilter.val());

			for await (const messages of messageGenerator) messages.forEach(message => renderChatMessage(message));
		});
	});
});

export const _isESmodule = true;
