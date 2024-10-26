(() => {
	/**
	 * Inject a script into the site
	 * @param src Script source
	 * @returns Promise when loaded
	 */
	const injectScript = (src: string) => {
		const script = document.createElement('script');
		script.src = src;
		script.type = 'module';

		document.head.append(script);

		return new Promise<void>(resolve => {
			/**
			 * Resolves once script onload is triggered
			 * @returns void
			 */
			script.addEventListener('load', () => resolve());
		});
	};

	const meta = JSON.parse(document.currentScript?.dataset.meta ?? '{}');

	window.addons = meta;

	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	Function(meta.loader)();

	Promise.all([
		injectScript(`${meta.extensionUrl}scripts/content/preload.js`),
		injectScript(`${meta.extensionUrl}scripts/content/patches.js`)
	]).then(() => {
		injectScript(`${meta.extensionUrl}scripts/content/statisticsSnippet.js`);
		injectScript(`${meta.extensionUrl}scripts/content/menu.js`);
		injectScript(`${meta.extensionUrl}scripts/content/playerNameElement.js`);
		injectScript(`${meta.extensionUrl}scripts/content/maskUsernames.js`);
		injectScript(`${meta.extensionUrl}scripts/content/classicMouse.js`);
		injectScript(`${meta.extensionUrl}scripts/content/forum.js`);
		injectScript(`${meta.extensionUrl}scripts/content/chat.js`);
		injectScript(`${meta.extensionUrl}scripts/content/lobby.js`);
		injectScript(`${meta.extensionUrl}scripts/content/gameSettings.js`);
		injectScript(`${meta.extensionUrl}scripts/content/tankNameOnClick.js`);
		injectScript(`${meta.extensionUrl}scripts/content/deathCount.js`);
		injectScript(`${meta.extensionUrl}scripts/content/emporium.js`);
		injectScript(`${meta.extensionUrl}scripts/content/accountMenu.js`);
	});
})();
