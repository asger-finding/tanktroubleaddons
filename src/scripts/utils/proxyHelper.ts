type SomeObject = { [key: string]: unknown };
type SomeFunction = (...args: unknown[]) => unknown;
type InterceptHandler = (original: SomeFunction, ...args: unknown[]) => unknown;

// eslint-disable-next-line @typescript-eslint/naming-convention, init-declarations
declare const Content: {
	init: (...args: unknown[]) => unknown;
};

export default class ProxyHelper {

	/**
	 * Pass a function to a hook with the correct context
	 * @param {object} context Function context (e.g `window`)
	 * @param funcName Function identifier in the context
	 * @param handler Hook to call before the original
	 * @param {any[]} attributes Optionally additional descriptors
	 */
	static interceptFunction(context: SomeObject, funcName: string, handler: InterceptHandler, attributes?: SomeObject) {
		const original = Reflect.get(context, funcName);
		if (typeof original !== 'function') throw new Error('Item passed is not typeof function');

		Reflect.defineProperty(context, funcName, {
			/**
			 * Call the handler with the original function bound to its context
			 * and supply with the arguments list
			 * @param args Arguments passed from outside
			 * @returns Original function return value
			 */
			value: (...args: unknown[]) => handler(original.bind(context), ...args),
			...attributes
		});
	}

	/**
	 * Fires when the document is readyState `interactive` or `complete`
	 * @returns Promise that resolves upon content loaded
	 */
	static whenContentLoaded() {
		return new Promise<void>(resolve => {
			if (document.readyState === 'interactive' || document.readyState === 'complete') resolve();
			else addEventListener('DOMContentLoaded', () => resolve());
		});
	}

	/**
	 * Fires when the `main()` function is done on TankTrouble.
	 * @returns {Promise<void>} Promise that resolves when Content.init() finishes
	 */
	static whenContentInitialized() {
		return this.whenContentLoaded().then(() => this.#createInitProxy());
	}

	/**
	 * Apply a hook to Content.init which resolves when the function finishes
	 * @returns {Promise<void>} Promise which resolves when Content.init has finished
	 * @private
	 */
	static #createInitProxy() {
		const functionString = Function.prototype.toString.call(Content.init);
		const isAlreadyHooked = /hooked-by-userscript/u.test(functionString);

		return new Promise<void>(resolve => {
			if (isAlreadyHooked) {
				addEventListener('content-initialized', () => resolve(), { once: true, passive: true });
			} else {
				const event = new CustomEvent('content-initialized');

				const { init } = Content;
				Reflect.defineProperty(Content, 'init', {
					/**
					 * Intercept the Content.init function, add a stamp, dispatch the custom event and resolve
					 * @param args Arguments passed from outside
					 * @returns Original function return value
					 */
					value: (...args: unknown[]) => {
						// Hack that will add the string to
						// the return of toString so we can
						// lookup if it's already hooked
						// eslint-disable-next-line no-void
						void 'hooked-by-userscript';

						const result = init(...args);

						dispatchEvent(event);
						resolve();
						return result;
					},
					configurable: true
				});
			}
		});
	}

}

export const _isESmodule = true;
