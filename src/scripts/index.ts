import { dispatchMessage, listen } from './common/ipcBridge.js';
import { setBrowserNamespace } from './common/set-browser-namespace.js';
import { setupStoreHandler } from './common/store.js';

setBrowserNamespace();
setupStoreHandler();

class Addons {

	inject: HTMLScriptElement;

	meta = <{
		extensionUrl: string;
		release: string;
		data: string;
		loader: string;
	}>{};

	/** Create new addons class */
	constructor() {
		this.inject = document.createElement('script');
		this.inject.src = browser.runtime.getURL('scripts/inject.js');
	}

	/**
	 * Load the extension into the website
	 */
	public load() {
		Addons.setupFetchNoCors();

		Addons.waitForLoader().then(loader => {
			const code = String(loader.textContent);
			loader.textContent = '';

			const coreText = code.slice(
				code.indexOf('.load(') + 6,
				code.indexOf(',function(')
			);
			const releaseVersion = coreText.slice(1, coreText.indexOf('/content.php'));
			const data = coreText.slice(coreText.indexOf('/content.php') + 14);

			this.meta.extensionUrl = browser.runtime.getURL('');
			this.meta.release = releaseVersion;
			this.meta.data = data;
			this.meta.loader = code;

			this.inject.dataset.meta = JSON.stringify(this.meta);

			document.body.insertBefore(this.inject, loader);
		});
	}

	/**
	 * Observe the nodetree for new elements and resolve for the initialization script
	 */
	private static waitForLoader(): Promise<HTMLScriptElement> {
		/**
		 * Traverse a callback from a MutationObserver event and run the callback
		 * on any HTMLScriptElement in document.body
		 * @param mutations Mutation record
		 * @param cb Callback method
		 */
		const traverse = (mutations: MutationRecord[], cb: (node: HTMLScriptElement) => void): void => {
			for (const mutationRecord of mutations) {
				if (mutationRecord.target !== document.body) continue;

				for (const node of mutationRecord.addedNodes) {
					if (node instanceof HTMLScriptElement) {
						// We found what might be the init script
						// eslint-disable-next-line callback-return
						cb(node);
						break;
					}
				}
			}
		};

		return new Promise(resolve => {
			new MutationObserver((mutations, observer) => {
				traverse(mutations, node => {
					if (node.textContent?.includes('content.php')) {
						observer.disconnect();
						resolve(node);
					}
				});
			}).observe(document.documentElement, {
				childList: true,
				subtree: true
			});
		});

	}

	/**
	 * Get value(s) from the store
	 * @param keys Array of keys to retrieve
	 * @returns Value to the key
	 */
	static get(keys: Array<string>) {
		return browser.storage.local.get(keys);
	}

	/**
	 * Get a value from the store with a fallback value if undefined
	 * @param key Key identifier
	 * @param fallback Fallback value
	 * @returns Value to the key or fallback value
	 */
	static getWithFallback(key: string, fallback: any) {
		return new Promise<string>(resolve => {
			browser.storage.local.get(key, result => {
				resolve(result[key] ?? fallback);
			});
		});
	}

	/**
	 * Set a value to the store given a key-value pair
	 * @param key Key
	 * @param value Value
	 */
	static set(key: string, value: string): void {
		browser.storage.local.set({ [key]: value });
	}

	/**
	 * Bypass cors for sites exempt in `host_permissions` in manifest
	 * @param args Fetch arguments
	 * @returns Resolves when fetch finalizes
	 */
	static async fetchNoCors(...args: Parameters<typeof fetch>): Promise<unknown> {
		const [resource, options] = args;

		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage({
				action: 'CORS_EXEMPT_FETCH',
				resource,
				options
			}, response => {
				if (response && response.success) resolve(response.data);
				else reject(response.error || 'Unknown error');
			}
			);
		});
	}

	/**
	 * Set up listener for cors-bypass fetch requests from the inject scripts
	 */
	static setupFetchNoCors() {
		listen(['CORS_EXEMPT_FETCH'], ({ detail }) => {
			if (!detail) throw new Error('No details provided for cors exempt fetch');

			const resource = detail.data?.resource;
			if (!resource) throw new Error('No url provided for cors exempt fetch');

			Addons.fetchNoCors(resource, detail.data?.options ?? {})
				.then(result => {
					dispatchMessage(null, {
						type: 'CORS_EXEMPT_FETCH_RESULT',
						data: {
							result,
							uuid: detail.data?.uuid
						}
					});
				});
		});
	}

}



const addon = new Addons();
addon.load();

//# HMRContent
