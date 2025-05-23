type SomeFunction = (...args: unknown[]) => unknown;
type InterceptHandler = (original: SomeFunction, ...args: unknown[]) => unknown;

interface InterceptOptions {
	isPrototype?: boolean;
	isClassy?: boolean;
	propertyAttributes?: PropertyDescriptor;
}

// eslint-disable-next-line @typescript-eslint/naming-convention, init-declarations
declare const Content: {
	init: (...args: unknown[]) => unknown;
};

export default class ProxyHelper {

	/**
	 * Pass a function to a hook with the correct context
	 * @param {object} context The object containing the function to intercept
	 * @param funcName Name of the function in the context
	 * @param handler Function to call before the original
	 * @param options Configuration options
	 */
	static interceptFunction(
		context: any,
		funcName: string,
		handler: InterceptHandler,
		options?: InterceptOptions
	) {
		const { isPrototype = false, isClassy = false, propertyAttributes = {} } = options || {};

		// Handle Classy library methods
		if (isClassy) {
			const original = context.getMethod(funcName);
			if (typeof original !== 'function') throw new Error('Classy method is not a function');

			context.method(funcName, function(this: any, ...args: any[]) {
				return handler.apply(this, [original.bind(this), ...args]);
			});
			return;
		}

		const original = Reflect.get(context, funcName);
		if (typeof original !== 'function') throw new Error('Item to intercept is not a function');

		if (isPrototype) {
			Reflect.defineProperty(context, funcName, {
				value(this: any, ...args: any[]) {
					const boundOriginal = original.bind(this);
					return handler.call(this, boundOriginal, ...args);
				},
				...propertyAttributes
			});
			return;
		}

		Reflect.defineProperty(context, funcName, {
			/**
			 * Default hook
			 * @param args Function arguments
			 * @returns Some return value
			 */
			value: (...args: any[]) => handler(() => original.apply(context, args), ...args),
			...propertyAttributes
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
