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
	fullscreen: false,
	statisticsState: 'global'
};

startSyncStore(defaultState);

let lastWindowState: chrome.windows.windowStateEnum = 'normal';

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

/**
 * Fullscreen or unfullscreen the current tab
 * @param state Should the fullscreen be on or off?
 */
function toggleFullscreen(state?: 'on' | 'off') {
	chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
		if (tabs.length === 0) return;

		const [tab] = tabs;
		const { windowId } = tab;

		if (typeof tab.url === 'undefined') return;

		const { hostname } = new URL(tab.url);
		if (hostname === 'tanktrouble.com' || hostname.endsWith('.tanktrouble.com')) {
			chrome.windows.get(windowId, window => {
				const currentState = window.state ?? 'normal';

				// Update lastWindowState only if the current state is not fullscreen
				if (currentState !== 'fullscreen') lastWindowState = currentState;

				chrome.windows.update(windowId, {
					state: state === 'on' ? 'fullscreen' : lastWindowState
				});
			});
		}
	});
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
	} else if (request.action === 'FULLSCREEN') {
		toggleFullscreen(request.state);

		return true;
	}
});


//# HMRBackground
