class GameLoader {
	extensionData: HTMLElement;
	hasherScript: HTMLScriptElement;
	head: HTMLHeadElement;

	constructor() {
		this.hasherScript = Object.assign(document.createElement('script'), {
			'src': chrome.runtime.getURL('script/hasher.js'),
			'type': 'module'
		});
		this.extensionData = document.createElement('tanktroubleaddons');
		this.extensionData.dataset.url = chrome.runtime.getURL('');
		this.extensionData.dataset.theme = 'dark'; // Todo: Toggleable theme [standard, dark, something else?]
	}

	observe() {
		document.documentElement.insertBefore(this.extensionData, document.documentElement.firstChild);

		new MutationObserver((mutations, observer) => {
			for (const { addedNodes } of mutations) {
				for (const node of addedNodes) {
					if (node instanceof HTMLElement) {
						if (node.tagName === 'HEAD') {
							this.head = <HTMLHeadElement>node;
							this.head.insertBefore(this.hasherScript, this.head.firstChild);
	
						} else if (node.parentElement?.tagName === 'BODY' && node.tagName === 'SCRIPT' && node.textContent.includes('content.php')) {
							this.extensionData.dataset.loader = node.textContent;
							Object.assign(node, {
								'textContent': '',
								'src': chrome.runtime.getURL('script/IndexLoader.js'),
								'type': 'module'
							});
	
							observer.disconnect();
							return;
						}
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
