class GameLoader {
	extensionData: HTMLElement;
	hasherScript: HTMLScriptElement;
	indexLoader: HTMLScriptElement;
	head: HTMLHeadElement;

	constructor() {
		this.hasherScript = document.createElement('script');
		this.hasherScript.src = chrome.runtime.getURL('script/hasher.js');
		this.hasherScript.type = 'module';

		this.indexLoader = document.createElement('script');
		this.indexLoader.src = chrome.runtime.getURL('script/IndexLoader.js');
		this.indexLoader.type = 'module';

		this.extensionData = document.createElement('tanktroubleaddons');
		this.extensionData.dataset.url = chrome.runtime.getURL('');
		this.extensionData.dataset.theme = 'dark';
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
							
							node.textContent = '';
							node.parentElement.insertBefore(this.indexLoader, node);
	
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
