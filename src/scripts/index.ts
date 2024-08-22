(async() => {
	class Addon {

		metaElement: HTMLElement;

		inject: HTMLScriptElement;

		head!: HTMLHeadElement;

		constructor() {
			this.inject = document.createElement('script');
			this.inject.src = chrome.runtime.getURL('scripts/inject.js');
			this.inject.type = 'module';

			this.metaElement = document.createElement('tanktroubleaddons');
			this.metaElement.dataset.extensionUrl = chrome.runtime.getURL('').slice(0, -1);
			this.getWithFallback('theme', 'dark').then(theme => {
				this.metaElement.dataset.userTheme = theme;
			});
		}

		public observe(): Promise<string> {
			document.documentElement.insertBefore(this.metaElement, document.documentElement.firstChild);

			const traverseNodeTree = (mutations: MutationRecord[], cb: (node: HTMLScriptElement) => void) => {
				for (const mutationRecord of mutations) {
					if (mutationRecord.target !== document.body) continue;

					for (const node of mutationRecord.addedNodes) {
						if (node instanceof HTMLScriptElement) {
							// We found what may be the init script
							return cb(node);
						}
					}
				}
			};

			return new Promise(resolve => {
				new MutationObserver((mutations, observer) => {
					traverseNodeTree(mutations, node => {
						if (node.textContent?.includes('content.php')) {
							this.metaElement.dataset.loader = node.textContent;

							node.textContent = '';
							document.body.insertBefore(this.inject, node);

							observer.disconnect();
							resolve(node.textContent);
						}
					});
				}).observe(document.documentElement, {
					childList: true,
					subtree: true
				});
			});

		}

		get(keys: Array<string>) {
			return chrome.storage.local.get(keys);
		}

		getWithFallback(key: string, fallback: string) {
			return new Promise<string>(resolve => {
				chrome.storage.local.get(key, result => {
					resolve(result[key] || fallback);
				});
			});
		}

		set(key: string, value: string) {
			chrome.storage.local.set({ [key]: value }, void function(result: unknown) {
				return result[key];
			});
		}

		public load() {
			this.observe();
		}

	}

	const addon = new Addon();
	addon.load();
})();
