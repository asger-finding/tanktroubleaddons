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
 * Get the focused tab
 * @returns Current tab (if any)
 */
async function getFocusedTab() {
	const tabs = await browser.tabs.query({
		active: true,
		currentWindow: true
	});
	return (tabs.length > 0) ? tabs[0] : null;
}

/**
 * Check if url domain is TankTrouble
 * @param url URL string
 * @returns Is TankTrouble?
 */
function isTankTrouble(url: string) {
	const { hostname } = new URL(url);
	return hostname === 'tanktrouble.com' || hostname.endsWith('.tanktrouble.com');
}

/**
 * Fullscreen or unfullscreen the current tab
 * @param state Should the fullscreen be on or off?
 */
async function toggleFullscreen(state?: 'on' | 'off') {
	const tab = await getFocusedTab();
	if (tab === null) return;
	if (typeof tab.url === 'undefined') return;

	const { windowId } = tab;

	if (isTankTrouble(tab.url)) {
		browser.windows.get(windowId, window => {
			const currentState = window.state ?? 'normal';

			// Update lastWindowState only if the current state is not fullscreen
			if (currentState !== 'fullscreen') lastWindowState = currentState;

			browser.windows.update(windowId, {
				state: state === 'on' ? 'fullscreen' : lastWindowState
			});
		});
	}
}

/**
 * Event handler for onclick action.
 */
async function toggleMenu() {
	const tab = await getFocusedTab();

	if (tab === null) return;
	if (typeof tab.url === 'undefined') return;
	if (typeof tab.id === 'undefined') return;

	if (isTankTrouble(tab.url)) {
		browser.scripting.executeScript({
			target: { tabId: tab.id },
			files: [ 'scripts/toggleMenu.js' ]
		});
	}
}

// Event to toggle menu when extension's button is clicked
browser.action.onClicked.addListener(toggleMenu);

// Listener for fetch requests from the content script
// eslint-disable-next-line consistent-return
browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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
