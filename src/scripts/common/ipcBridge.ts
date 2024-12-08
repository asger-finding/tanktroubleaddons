import { setBrowserNamespace } from '../common/set-browser-namespace.js';

setBrowserNamespace();

type MessageData = {
	type: string;
	key?: string;
	data?: Record<string, any>;
};

interface CustomIpcEvent extends Partial<Event> {
	detail?: MessageData
}

export type Callback = (evt: CustomIpcEvent) => void;

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
 * @param to Recepient
 * @param data Message data
 */
export const dispatchMessage = (to: Process | null, data: MessageData) => {
	const eventName = to || thisProcess;
	const event = new CustomEvent(eventName, { detail: data });
	dispatchEvent(event);
};

/**
 * Receive ipc messages
 * @param types Only subscribe to certain messages
 * @param cb Callback function
 * @param from Expected sender (optional)
 */
export const listen = (types: MessageData['type'][] | null, cb: Callback, from?: Process | null) => {
	const eventName = from || foreignProcess;
	addEventListener(eventName, (evt: CustomIpcEvent) => {
		const type = evt.detail?.type;
		if (types === null || (type && types.includes(type))) return cb(evt);
		return null;
	}, { passive: true });
};

/**
 * Receive a specific ipc message once, then destroy listener
 * @param type Message to listen for
 * @param conditional Specific key identifier to match against
 * @param cb Callback function
 * @param from Expected sender (optional)
 */
export const once = (type: MessageData['type'], conditional: (evt: CustomIpcEvent) => boolean, cb: Callback, from?: Process | null) => {
	const eventName = from || foreignProcess;

	/**
	 * One-time listener
	 * @param evt Event object
	 * @returns void
	 */
	const listener = (evt: CustomIpcEvent) => {
		if (evt.detail?.type === type) {
			if (conditional !== null && !conditional(evt)) return null;

			removeEventListener(eventName, listener);
			return cb(evt);
		}

		return null;
	};
	addEventListener(eventName, listener, { passive: true });
};

export const _isESmodule = true;
