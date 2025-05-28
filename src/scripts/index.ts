import { dispatchMessage, listen } from './common/ipcBridge.js';
import { setBrowserNamespace } from './common/set-browser-namespace.js';
import { setupStoreHandler } from './common/store.js';

setBrowserNamespace();
setupStoreHandler();

export interface AddonsMeta {
	extensionUrl: string;
	release: string;
	data: string;
	loader: string;
}

class Addons {

	private inject: HTMLScriptElement;

	private meta: AddonsMeta = {
		extensionUrl: '',
		release: '',
		data: '',
		loader: ''
	};

	/** Create a new Addons instance */
	constructor() {
		this.inject = document.createElement('script');
		this.inject.src = browser.runtime.getURL('scripts/inject.js');
	}

	/**
	 * Load the extension into the website by injecting the script and parsing loader metadata
	 */
	public load(): void {
		Addons.setupFetchNoCors();
		Addons.setupFullscreen();

		Addons.waitForLoader().then(loader => {
			const code = String(loader.textContent);
			loader.textContent = '';

			const loadStart = code.indexOf('.load(');
			const funcStart = code.indexOf(',function(');
			if (loadStart === -1 || funcStart === -1) throw new Error('Loader structure not recognized');

			const coreText = code.slice(loadStart + 6, funcStart);
			const releaseEnd = coreText.indexOf('/content.php');
			if (releaseEnd === -1) throw new Error('Release version marker not found');

			const releaseVersion = coreText.slice(1, releaseEnd);
			const data = coreText.slice(releaseEnd + 14);

			this.meta.extensionUrl = browser.runtime.getURL('');
			this.meta.release = releaseVersion;
			this.meta.data = data;
			this.meta.loader = code;

			this.inject.dataset.meta = JSON.stringify(this.meta);

			document.body.insertBefore(this.inject, loader);
		});
	}

	/**
	 * Wait for the loader script containing 'content.php' to appear in the document
	 * @returns {Promise<HTMLScriptElement>} Resolves with the found script element
	 */
	private static waitForLoader(): Promise<HTMLScriptElement> {
		return new Promise(resolve => {
			const observer = new MutationObserver((mutations, obs) => {
				for (const mutation of mutations) {
					for (const node of mutation.addedNodes) {
						if (node instanceof HTMLScriptElement && node.textContent?.includes('content.php')) {
							obs.disconnect();
							resolve(node);
							return;
						}
					}
				}
			});
			observer.observe(document.documentElement, {
				childList: true,
				subtree: true
			});
		});
	}

	/**
	 * Retrieve multiple values from the browser store
	 * @param {Array<string>} keys Array of keys to retrieve
	 * @returns {Promise<Record<string, any>>} Resolves with key-value pairs
	 */
	static get(keys: Array<string>): Promise<Record<string, any>> {
		return browser.storage.local.get(keys);
	}

	/**
	 * Retrieve a value from the browser store or return a fallback if undefined
	 * @param {string} key Key identifier
	 * @param {any} fallback Fallback value if key is missing
	 * @returns {Promise<any>} Resolves with the stored value or fallback
	 */
	static getWithFallback(key: string, fallback: any): Promise<any> {
		return new Promise(resolve => {
			browser.storage.local.get(key, result => {
				resolve(typeof result[key] !== 'undefined' ? result[key] : fallback);
			});
		});
	}

	/**
	 * Set a key-value pair in the browser store
	 * @param {string} key Key to set
	 * @param {any} value Value to assign
	 * @returns {Promise<void>} Resolves when the value is set
	 */
	static set(key: string, value: any): Promise<void> {
		return browser.storage.local.set({ [key]: value });
	}

	/**
	 * Perform a CORS-exempt fetch via extension background message
	 * @param {RequestInfo} resource Resource to fetch
	 * @param {RequestInit} [options] Fetch options
	 * @returns {Promise<unknown>} Resolves with the fetched data
	 */
	static async fetchNoCors(resource: RequestInfo, options?: RequestInit): Promise<unknown> {
		return new Promise((resolve, reject) => {
			browser.runtime.sendMessage({
				action: 'CORS_EXEMPT_FETCH',
				resource,
				options
			}, response => {
				if (response && response.success) resolve(response.data);
				else reject(response?.error || 'Unknown error');
			});
		});
	}

	/**
	 * Set up listener for CORS-exempt fetch requests from injected scripts
	 */
	static setupFetchNoCors(): void {
		listen<{ resource: string; options?: RequestInit; uuid?: string }>(
			['CORS_EXEMPT_FETCH'],
			(evt) => {
				const { detail } = evt;
				if (!detail) throw new Error('No details provided for CORS-exempt fetch');

				const { resource, options, uuid } = detail.data ?? {};
				if (!resource) throw new Error('No resource provided for CORS-exempt fetch');

				Addons.fetchNoCors(resource, options ?? {})
					.then((result) => {
						dispatchMessage(null, {
							type: 'CORS_EXEMPT_FETCH_RESULT',
							data: { result, uuid }
						});
					})
					.catch((error) => {
						dispatchMessage(null, {
							type: 'CORS_EXEMPT_FETCH_ERROR',
							data: { error, uuid }
						});
					});
			}
		);
	}

	/**
	 * Set up listener for fullscreen toggle requests from injected scripts
	 */
	static setupFullscreen(): void {
		listen<{ state: string }>(['FULLSCREEN'], ({ detail }) => {
			if (!detail) throw new Error('No details provided for fullscreen request');

			const state = detail.data?.state;
			if (!state) throw new Error('No state provided for fullscreen request');

			return new Promise((resolve, reject) => {
				browser.runtime.sendMessage({
					action: 'FULLSCREEN',
					state
				}, response => {
					if (response && response.success) resolve(response.data);
					else reject(response?.error || 'Unknown error');
				});
			}).catch(error => {
				dispatchMessage(null, {
					type: 'FULLSCREEN_ERROR',
					data: { error }
				});
			});
		});
	}

}

const addon = new Addons();
addon.load();

//# HMRContent
