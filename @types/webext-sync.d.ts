/* eslint-disable init-declarations */
declare module 'webext-sync' {
	interface Storage {
		get: (key?: string | string[]) => Promise<{ [key: string]: any }>;
		set: (data: { [key: string]: any }) => Promise<{ [key: string]: any }>;
	}

	interface SyncStoreOptions {
		onChange: (callback: (newState: { [key: string]: any }, oldState: { [key: string]: any }) => void) => void;
		getState: (key?: string | string[]) => Promise<{ [key: string]: any }>;
		setState: (data: { [key: string]: any }) => Promise<{ [key: string]: any }>;
	}

	/**
	 * Retrieves a value from browser's local storage.
	 * @param key Optional key to fetch a specific value from local storage. If not provided, all keys are returned.
	 */
	export const get: (key?: string | string[]) => Promise<{ [key: string]: any }>;

	/**
	 * Stores data into browser's local storage.
	 * @param data An object representing key-value pairs to store.
	 */
	export const set: (data: { [key: string]: any }) => Promise<{ [key: string]: any }>;

	/**
	 * Initializes the sync store and merges the default state with the previous state in local storage.
	 * @param defaultState The initial state of the store.
	 * @returns An object containing methods to interact with the store.
	 */
	export const startSyncStore: (defaultState?: { [key: string]: any }) => Promise<SyncStoreOptions>;
}
