import { setBrowserNamespace } from './common/set-browser-namespace.js';
import { startSyncStore } from 'webext-sync';

setBrowserNamespace();

// Default store config
const defaultState = {
	theme: {
		classToken: 'normal',
		colorScheme: 'light'
	},
	classicMouse: true,
	tintedBullets: false,
	statisticsState: 'global'
};

startSyncStore(defaultState);

/**
 * Get the tab id of the focused tab
 * @returns Current tab id (if any)
 */
async function getTabId() {
	const tabs = await browser.tabs.query({
		active: true,
		currentWindow: true
	});
	return (tabs.length > 0) ? tabs[0].id : null;
}

/**
 * Event handler for onclick action. Execute a script on click.
 */
async function execScript() {
	const tabId = await getTabId();
	if (tabId) {
		browser.scripting.executeScript({
			target: { tabId },
			files: [ 'scripts/execute.js' ]
		});
	}
}


// event to run execute.js content when extension's button is clicked
browser.action.onClicked.addListener(execScript);

// Listener for fetch requests from the content script
// eslint-disable-next-line consistent-return
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	if (request.action === 'CORS_EXEMPT_FETCH' && request.resource) {
		const { resource, options, uuid } = request;

		fetch(resource, options || {})
			.then(response => response.json())
			.then(data => sendResponse({ success: true, data, uuid }))
			.catch(error => sendResponse({ success: false, error }));

		return true;
	}
});


//# HMRBackground
