(() => {
	/**
	 * Locate the meta element and return it
	 * @returns HTMLElement
	 */
	const setMeta = () => {
		const metaElement = document.querySelector('tanktroubleaddons');

		if (metaElement instanceof HTMLElement) {
			const meta = { ...metaElement.dataset };

			if (Object.keys(meta).length === 0) throw new TypeError('Extension metadata element is empty');

			window.addons = meta as Window['addons'];

			return window.addons;
		}
		throw new DOMException('Extension metadata element not found', 'NOT_FOUND_ERR');
	};

	/**
	 * Inject a script into the site
	 * @param src Script source
	 * @returns Promise when loaded
	 */
	const injectScript = (src: string): Promise<void> => {
		const script = document.createElement('script');
		script.src = src;
		script.type = 'module';

		document.head.appendChild(script);

		return new Promise<void>(resolve => {
			/**
			 * Resolves once script onload is triggered
			 * @returns voids
			 */
			script.onload = () => resolve();
		});
	};

	const meta = setMeta();

	// We are just evaluating the code in the meta block
	// eslint-disable-next-line no-eval
	eval(meta.loader ?? '');

	Promise.all([
		injectScript(`${meta.extensionUrl}/scripts/content/preload.js`),
		injectScript(`${meta.extensionUrl}/scripts/content/patches.js`)
	]).then(() => {
		injectScript(`${meta.extensionUrl}/scripts/content/menu.js`);
		injectScript(`${meta.extensionUrl}/scripts/content/playerNameElement.js`);
		injectScript(`${meta.extensionUrl}/scripts/content/maskUsernames.js`);
		injectScript(`${meta.extensionUrl}/scripts/content/classicMouse.js`);
		injectScript(`${meta.extensionUrl}/scripts/content/forum.js`);
		injectScript(`${meta.extensionUrl}/scripts/content/chat.js`);
		injectScript(`${meta.extensionUrl}/scripts/content/lobby.js`);
		injectScript(`${meta.extensionUrl}/scripts/content/gameSettings.js`);
		injectScript(`${meta.extensionUrl}/scripts/content/deathCount.js`);
		injectScript(`${meta.extensionUrl}/scripts/content/emporium.js`);
		injectScript(`${meta.extensionUrl}/scripts/content/accountMenu.js`);
	});
})();
