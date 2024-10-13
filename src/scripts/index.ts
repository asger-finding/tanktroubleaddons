class Addons {

	metaElement = document.createElement('tanktroubleaddons');

	inject: HTMLScriptElement;

	/** Create new addons class */
	constructor() {
		this.inject = document.createElement('script');
		this.inject.src = chrome.runtime.getURL('scripts/inject.js');
		this.inject.type = 'module';
	}

	/**
	 * Observe the nodetree for new elements and resolve for the initialization script
	 */
	public observe(): Promise<string> {
		document.documentElement.insertBefore(this.metaElement, document.documentElement.firstChild);

		/**
		 * Traverse a callback from a MutationObserver event and run the callback
		 * on any HTMLScriptElement in document.body
		 * @param mutations Mutation record
		 * @param cb Callback method
		 */
		const traverseMutationRecord = (mutations: MutationRecord[], cb: (node: HTMLScriptElement) => void): void => {
			for (const mutationRecord of mutations) {
				if (mutationRecord.target !== document.body) continue;

				for (const node of mutationRecord.addedNodes) {
					if (node instanceof HTMLScriptElement) {
						// We found what may be the init script
						// eslint-disable-next-line callback-return
						cb(node);
						break;
					}
				}
			}
		};

		return new Promise(resolve => {
			new MutationObserver((mutations, observer) => {
				traverseMutationRecord(mutations, node => {
					if (node.textContent?.includes('content.php')) {
						this.metaElement.dataset.loader = node.textContent;

						node.textContent = '';
						document.body.insertBefore(this.inject, node);

						observer.disconnect();
						resolve(this.metaElement.dataset.loader);
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
		return chrome.storage.local.get(keys);
	}

	/**
	 * Get a value from the store with a fallback value if undefined
	 * @param key Key identifier
	 * @param fallback Fallback value
	 * @returns Value to the key or fallback value
	 */
	static getWithFallback(key: string, fallback: any) {
		return new Promise<string>(resolve => {
			chrome.storage.local.get(key, result => {
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
		chrome.storage.local.set({ [key]: value });
	}

	/**
	 * Load the extension into the website
	 */
	public load() {
		Addons.getWithFallback('theme', 'dark').then(theme => {
			this.metaElement.dataset.userTheme = theme;
		});

		this.observe().then(loader => {
			const coreText = loader.slice(
				loader.indexOf('.load(') + 6,
				loader.indexOf(',function(')
			);
			const releaseVersion = coreText.slice(1, coreText.indexOf('/content.php'));
			const data = coreText.slice(coreText.indexOf('/content.php') + 14);

			this.metaElement.dataset.extensionUrl = chrome.runtime.getURL('').slice(0, -1);
			this.metaElement.dataset.release = releaseVersion;
			this.metaElement.dataset.data = data;
			this.metaElement.dataset.loader = loader;
		});
	}

}

const addon = new Addons();
addon.load();

//# HMRContent
