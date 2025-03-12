/* eslint-disable init-declarations */
import { Callback, dispatchMessage, listen, once } from './ipcBridge.js';
import { SyncStoreOptions } from 'webext-sync';
import { setBrowserNamespace } from '../common/set-browser-namespace.js';

setBrowserNamespace();

export enum StoreEvent {
	READ = 'read',
	WRITE = 'write',
	READ_RESPONSE = 'read_response',
	WRITE_RESPONSE = 'write_response',
	STORE_CHANGE = 'store_change'
}

/**
 * Read a key from the store
 * @param key Key to get
 * @returns Value
 */
export let get: ((key: string) => Promise<unknown>);

/**
 * Write a key/value pair to the store
 * @param key Key to set
 * @param value Value to set
 * @returns Promise for value once set
 */
export let set: ((key: string, value: any) => Promise<unknown>);

/**
 * Add a change event listener
 * @param cb Callback on event
 */
export let onStateChange: (cb: Callback) => void;

/** Handle read/write requests on the main side */
export let setupStoreHandler: () => void;

/* eslint-disable jsdoc/require-jsdoc */
if (!browser.runtime) {
	// We are in an inject script, which doesn't
	// have access to the runtime or storage

	get = key => {
		const promise = new Promise(resolve => {
			once(StoreEvent.READ_RESPONSE, evt => evt.detail?.key === key, evt => resolve(evt.detail?.data));
		});

		dispatchMessage(null, {
			type: StoreEvent.READ,
			key
		});

		return promise;
	};

	set = (key, value) => {
		const promise = new Promise(resolve => {
			once(StoreEvent.WRITE_RESPONSE, evt => evt.detail?.key === key, evt => resolve(evt.detail?.data));
		});

		dispatchMessage(null, {
			type: StoreEvent.WRITE,
			key,
			data: value
		});

		return promise;
	};

	onStateChange = cb => {
		listen(Object.values(StoreEvent), cb);
	};

} else {
	let syncStore: SyncStoreOptions;
	let state: { [key: string]: any };

	setupStoreHandler = () => {
		listen(null, evt => {
			const { detail } = evt;
			if (!detail || typeof detail.key === 'undefined') return;

			switch (detail.type) {
				case StoreEvent.READ:
					get(detail.key);
					break;
				case StoreEvent.WRITE:
					set(detail.key, detail?.data);
					break;
				default:
					break;
			}
		});
	};

	get = key => {
		const result = state[key];

		dispatchMessage(null, {
			type: StoreEvent.READ_RESPONSE,
			key,
			data: result
		});

		return Promise.resolve(result);
	};

	set = async(key, value) => {
		const result = await syncStore.setState({
			...state,
			[key]: value
		});
		dispatchMessage(null, {
			type: StoreEvent.WRITE_RESPONSE,
			key,
			data: result[key]
		});
		return result;
	};

	// We are in a content script, which does have runtime access
	import('webext-sync').then(async({ startSyncStore }) => {
		syncStore = await startSyncStore();
		state = await syncStore.getState();

		/**
		 * Intersect two objects and return the key/value pairs,
		 * with the values being determined by the first object
		 * @param first First object
		 * @param sec Second object
		 * @returns Intersection
		 */
		const getIntersectingKeys = (first: { [key: string]: any }, sec: { [key: string]: any }) => Object.fromEntries(
			Object.keys(first)
				.filter(key => key in sec)
				.map(key => [key, first[key]])
		);

		syncStore.onChange((newState, oldState) => {
			const newRelevant = getIntersectingKeys(newState, oldState);

			dispatchMessage(null, {
				type: StoreEvent.STORE_CHANGE,
				data: {
					curr: newRelevant,
					prev: oldState
				}
			});
			state = newState;
		});

	});
}
/* eslint-enable jsdoc/require-jsdoc */
