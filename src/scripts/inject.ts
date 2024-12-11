(() => {
	/**
	 * Inject a script into the site
	 * @param src Script source
	 * @param fetchPriority Should the script have priority?
	 * @returns Promise when loaded
	 */
	const injectScript = (src: string, fetchPriority?: true) => {
		const script = document.createElement('script');
		script.src = src;
		script.type = 'module';
		script.fetchPriority = fetchPriority ? 'high' : 'auto';

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

	Object.defineProperty(window, 'Addons', {
		value: {},
		writable: false,
		configurable: false
	});

	Object.assign(Addons, {
		/**
		 * Create a link to an extension resource
		 * @param url Path to file
		 * @returns Url to concate
		 */
		t_url: (url: string) => `${ meta.extensionUrl }${ url }`
	});

	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	Function(meta.loader)();

	Promise.all([
		injectScript(`${meta.extensionUrl}scripts/content/preload.js`, true),
		injectScript(`${meta.extensionUrl}scripts/content/theme.js`, true),
		injectScript(`${meta.extensionUrl}scripts/content/patches.js`, true)
	]).then(() => {
		injectScript(`${meta.extensionUrl}scripts/content/statisticsSnippet.js`);
		injectScript(`${meta.extensionUrl}scripts/content/strokedText.js`);
		injectScript(`${meta.extensionUrl}scripts/content/forum.js`);
		injectScript(`${meta.extensionUrl}scripts/content/menu.js`);
		injectScript(`${meta.extensionUrl}scripts/content/switchControls.js`);
		injectScript(`${meta.extensionUrl}scripts/content/maskUsernames.js`);
		injectScript(`${meta.extensionUrl}scripts/content/classicMouse.js`);
		injectScript(`${meta.extensionUrl}scripts/content/chat.js`);
		injectScript(`${meta.extensionUrl}scripts/content/lobby.js`);
		injectScript(`${meta.extensionUrl}scripts/content/gameSettings.js`);
		injectScript(`${meta.extensionUrl}scripts/content/tankNameOnClick.js`);
		injectScript(`${meta.extensionUrl}scripts/content/tintedBullets.js`);
		injectScript(`${meta.extensionUrl}scripts/content/killedByMessage.js`);
		injectScript(`${meta.extensionUrl}scripts/content/deathCount.js`);
		injectScript(`${meta.extensionUrl}scripts/content/texturePacks.js`);
		injectScript(`${meta.extensionUrl}scripts/content/emporium.js`);
		injectScript(`${meta.extensionUrl}scripts/content/accountMenu.js`);
		injectScript(`${meta.extensionUrl}scripts/content/adminOverlays.js`);
	});
})();
