(() => {
	const meta = JSON.parse(document.currentScript?.dataset.meta ?? '{}');

	/**
	 * Inject a script into the site
	 * @param path Path to script in extension
	 * @param fetchPriority Should the script have priority?
	 * @returns Promise when loaded
	 */
	const inject = (path: string, fetchPriority?: true) => {
		const script = document.createElement('script');
		script.src = meta.extensionUrl + path;
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

	Promise.all([
		inject('scripts/content/patches.js', true),
		inject('scripts/content/preload.js', true),
		inject('scripts/content/theme.js', true)
	]).then(async() => {
		await Promise.all([
			inject('scripts/content/statisticsSnippet.js'),
			inject('scripts/content/strokedText.js'),
			inject('scripts/content/forum.js'),
			inject('scripts/content/menu.js'),
			inject('scripts/content/switchControls.js'),
			inject('scripts/content/maskUsernames.js'),
			inject('scripts/content/classicMouse.js'),
			inject('scripts/content/chat.js'),
			inject('scripts/content/lobby.js'),
			inject('scripts/content/gameSettings.js'),
			inject('scripts/content/tankNameOnClick.js'),
			inject('scripts/content/tintedBullets.js'),
			inject('scripts/content/killedByMessage.js'),
			inject('scripts/content/fullscreenGame.js'),
			inject('scripts/content/deathCount.js'),
			inject('scripts/content/texturePacks.js'),
			inject('scripts/content/emporium.js'),
			inject('scripts/content/accountMenu.js'),
			inject('scripts/content/adminOverlays.js')
		]);

		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		Function(meta.loader)();
	});
})();
