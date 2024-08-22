const rules: Array<{
	redirectPath: string;
	urlFilter: RegExp
}> = [];

/**
 *
 */
const setupWebRequestListener = () => {
	chrome.webRequest.onBeforeRequest.addListener(details => {
		for (const rule of rules) if (rule.urlFilter.test(details.url)) return { redirectUrl: chrome.runtime.getURL(rule.redirectPath) };

		return {};
	}, {
		urls: ['*://*.tanktrouble.com/*'],
		types: ['script']
	}, ['blocking']);
};

setupWebRequestListener();
