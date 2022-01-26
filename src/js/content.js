class GameLoader {
	constructor() {
		this.hasherScript = Object.assign(document.createElement('script'), {
			'src': chrome.runtime.getURL('js/hasher-sync.js') // Fixme: TEMPORARY, INJECT AS MODULE
		});
		this.extensionData = document.createElement('tanktroubleaddons');
		this.extensionData.dataset.url = chrome.runtime.getURL('');
		this.extensionData.dataset.theme = 'dark'; // Todo: Toggleable theme [standard, dark, something else?]
	}

	observe() {
		document.documentElement.insertBefore(this.extensionData, document.documentElement.firstChild);

		new MutationObserver((mutations, observer) => {
			for (let i = 0; i < mutations.length; i++) {
				for (const node of mutations[i].addedNodes) {
					if (node.tagName === 'HEAD') {
						this.head = node;
						this.head.insertBefore(this.hasherScript, this.head.firstChild);

					} else if (node.parentElement?.tagName === 'BODY' && node.tagName === 'SCRIPT' && node.textContent.includes('content.php')) {
						this.extensionData.dataset.loaderTextContent = node.textContent;
						Object.assign(node, {
							'textContent': '',
							'src': chrome.runtime.getURL('js/IndexLoader.js')
						});

						observer.disconnect();
						return;
					}
				}
			}
		}).observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	}
}

const loader = new GameLoader();
loader.observe();