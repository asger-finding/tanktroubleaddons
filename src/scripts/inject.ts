import { AddonsMeta } from './index.ts';

(() => {
	const metaString = document.currentScript?.dataset.meta;
	if (typeof metaString === 'undefined') throw new Error('Inject failed to get meta string');

	let meta: AddonsMeta = {
		extensionUrl: '',
		release: '',
		data: '',
		loader: ''
	};

	try {
		const parsed = JSON.parse(metaString);
		if (
			typeof parsed.extensionUrl !== 'string'
			|| typeof parsed.release !== 'string'
			|| typeof parsed.data !== 'string'
			|| typeof parsed.loader !== 'string'
		) throw new Error();

		meta = parsed;
	} catch {
		throw new Error('Inject failed to parse valid meta structure');
	}

	Object.defineProperty(window, 'Addons', {
		value: {},
		writable: false,
		configurable: false
	});

	Object.assign(Addons, {
		/**
		 * Create a link to an extension resource
		 * @param path Path to file
		 * @returns Concatenated url
		 */
		t_url: (path: string) => `${ meta.extensionUrl }${ path }`
	});

	/**
	 * Inject a script into the main site
	 * @param path Path to script in extension
	 * @param highPriority Should the script have fetch priority?
	 * @returns Resolves when the script has loaded
	 */
	const inject = (path: string, highPriority?: true) => {
		const script = document.createElement('script');
		script.src = `${ meta.extensionUrl }${ path }`;
		script.type = 'module';
		script.fetchPriority = highPriority ? 'high' : 'auto';

		document.head.append(script);

		return new Promise<void>((resolve, reject) => {
			script.addEventListener('load', () => resolve());
			script.addEventListener('error', () => reject(new Error(`Failed to load script: ${path}`)));
		});
	};

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
			inject('scripts/content/chat.js'),
			inject('scripts/content/lobby.js'),
			inject('scripts/content/gameSettings.js'),
			inject('scripts/content/tankNameOnClick.js'),
			inject('scripts/content/tintedBullets.js'),
			inject('scripts/content/killedByMessage.js'),
			inject('scripts/content/fullscreenGame.js'),
			inject('scripts/content/deathCount.js'),
			inject('scripts/content/resourcePacks.js'),
			inject('scripts/content/emporium.js'),
			inject('scripts/content/accountMenu.js'),
			inject('scripts/content/adminOverlays.js')
		]);

		// Run TankTrouble loader
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		Function(meta.loader)();
	}).catch(error => {
		throw new Error(`Addons loader failed: ${ error.message }`);
	});
})();
