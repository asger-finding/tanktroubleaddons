import { setBrowserNamespace } from '../scripts/common/set-browser-namespace.js';

setBrowserNamespace();

const rules: Array<{
	redirectPath: string;
	urlFilter: RegExp
}> = [];

/**
 *
 */
const setupWebRequestListener = () => {
	browser.webRequest.onBeforeRequest.addListener(details => {
		for (const rule of rules) if (rule.urlFilter.test(details.url)) return { redirectUrl: browser.runtime.getURL(rule.redirectPath) };

		return {};
	}, {
		urls: ['*://*.tanktrouble.com/*'],
		types: ['script']
	}, ['blocking']);
};

setupWebRequestListener();
