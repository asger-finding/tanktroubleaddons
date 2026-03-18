import { setBrowserNamespace } from './set-browser-namespace.js';

setBrowserNamespace();

type MessageData<T = Record<string, any>> = {
	type: string;
	key?: string;
	data?: T;
};

interface CustomIpcEvent<T = Record<string, any>> extends Event {
	detail?: MessageData<T>;
}

export type Callback<T = Record<string, any>> = (evt: CustomIpcEvent<T>) => void;

export enum Process {
	MAIN = 'addons_main',
	INJECT = 'addons_inject'
}

const thisProcess: Process = typeof browser.runtime === 'undefined'
	? Process.INJECT
	: Process.MAIN;
const foreignProcess: Process = typeof browser.runtime === 'undefined'
	? Process.MAIN
	: Process.INJECT;

/**
 * Dispatch a message over custom ipc
 * @param to Recipient process or null for self
 * @param data Message data
 */
export const dispatchMessage = <T>(to: Process | null, data: MessageData<T>): void => {
	const eventName = to || thisProcess;
	const event = new CustomEvent(eventName, { detail: JSON.stringify(data) });
	dispatchEvent(event);
};

/**
 * Subscribe to ipc messages
 * @param types Specific message types or null for all
 * @param cb Callback to execute
 * @param from Expected sender process or null
 */
export const listen = <T>(types: Array<MessageData['type']> | null, cb: Callback<T>, from?: Process | null): void => {
	const eventName = from || foreignProcess;
	addEventListener(eventName, (evt: Event) => {
		const raw = (evt as CustomEvent).detail;
		const detail: MessageData<T> | undefined = typeof raw === 'string' ? JSON.parse(raw) : raw;
		const customEvt = Object.create(evt, { detail: { value: detail } }) as CustomIpcEvent<T>;
		const type = detail?.type;

		if (types === null || (type && types.includes(type))) return cb(customEvt);
		return null;
	}, { passive: true });
};

/**
 * Subscribe once to a specific ipc message, then remove listener
 * @param types Message type or types to listen for
 * @param conditional Filter function
 * @param cb Callback to execute on match
 * @param from Expected sender process or null
 */
export const once = <T>(
	types: MessageData['type'] | Array<MessageData['type']>,
	conditional: (evt: CustomIpcEvent<T>) => boolean,
	cb: Callback<T>,
	from?: Process | null
): void => {
	const eventName = from || foreignProcess;
	const typeList = Array.isArray(types) ? types : [types];

	/**
	 * One-time listener
	 * @param evt Event object
	 */
	const listener = (evt: Event): void => {
		const raw = (evt as CustomEvent).detail;
		const detail: MessageData<T> | undefined = typeof raw === 'string' ? JSON.parse(raw) : raw;
		const customEvt = Object.create(evt, { detail: { value: detail } }) as CustomIpcEvent<T>;
		if (detail?.type && typeList.includes(detail.type) && conditional(customEvt)) {
			removeEventListener(eventName, listener);
			// eslint-disable-next-line callback-return
			cb(customEvt);
		}
	};

	addEventListener(eventName, listener, { passive: false });
};

export const _isESmodule = true;
