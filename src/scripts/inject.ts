declare const main: (...args: unknown[]) => never;
declare const load_red_infiltration: (...args: unknown[]) => never;

(() => {
	const loadMeta = () => {
		const metaElement = document.querySelector('tanktroubleaddons');

		if (metaElement instanceof HTMLElement) {
			const meta = { ...metaElement.dataset };

			if (Object.keys(meta).length === 0) throw new TypeError('Extension metadata element is empty');

			return meta;
		}

		throw new DOMException('Extension metadata element not found', 'NOT_FOUND_ERR');
	};

	const unloadMeta = () => {
		const metaElement = document.querySelector('tanktroubleaddons');
		if (metaElement) metaElement.remove();
	};

	const injectScript = (src: string) => {
		const script = document.createElement('script');
		script.src = src;
		script.type = 'module';

		document.head.appendChild(script);
	};

	const meta = loadMeta();

	unloadMeta();

	eval(meta.loader ?? '');

	injectScript(`${meta.extensionUrl}/scripts/content/patches.js`);
	injectScript(`${meta.extensionUrl}/scripts/content/playerNameElement.js`);
	injectScript(`${meta.extensionUrl}/scripts/content/maskUsernames.js`);
	injectScript(`${meta.extensionUrl}/scripts/content/forumAddons.js`);
	injectScript(`${meta.extensionUrl}/scripts/content/powerUserChat.js`);
	injectScript(`${meta.extensionUrl}/scripts/content/showEveryGame.js`);
	injectScript(`${meta.extensionUrl}/scripts/content/minimumQualitySetting.js`);
	injectScript(`${meta.extensionUrl}/scripts/content/deathCount.js`);
	injectScript(`${meta.extensionUrl}/scripts/content/emporiumWallet.js`);
	injectScript(`${meta.extensionUrl}/scripts/content/accountCreationDate.js`);
})();
