import { setBrowserNamespace } from './common/set-browser-namespace.js';
import { startSyncStore } from 'webext-sync';

setBrowserNamespace();

// Default store config
const defaultState = {
	theme: {
		classToken: 'normal',
		colorScheme: 'light'
	},
	showFullscreenButton: true,
	tintedBullets: false,
	fullscreen: false,
	statisticsState: 'global'
};

startSyncStore(defaultState);

let lastWindowState: chrome.windows.windowStateEnum = 'normal';

const disabledIconPaths = {
	32: browser.runtime.getURL('meta/32-disabled.png'),
	64: browser.runtime.getURL('meta/64-disabled.png'),
	96: browser.runtime.getURL('meta/96-disabled.png'),
	128: browser.runtime.getURL('meta/128-disabled.png')
};
const enabledIconPaths = {
	32: browser.runtime.getURL('meta/32.png'),
	64: browser.runtime.getURL('meta/64.png'),
	96: browser.runtime.getURL('meta/96.png'),
	128: browser.runtime.getURL('meta/128.png')
};

/**
 * Check if url domain is TankTrouble
 * @param url Tab URL
 * @returns Is TankTrouble?
 */
function isTankTrouble(url: chrome.tabs.Tab['url']) {
	if (typeof url === 'undefined') return false;

	try {
		const { hostname } = new URL(url);
		return hostname === 'tanktrouble.com' || hostname.endsWith('.tanktrouble.com');
	} catch {
		return false;
	}
}

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
 * Fullscreen or unfullscreen the current tab
 * @param state Should the fullscreen be on or off?
 */
async function toggleFullscreen(state?: 'on' | 'off') {
	const tab = await getFocusedTab();
	if (tab === null) return;

	const { windowId } = tab;

	if (isTankTrouble(tab.url)) {
		browser.windows.get(windowId, window => {
			const currentState = window.state ?? 'normal';

			browser.windows.update(windowId, {
				state: state === 'on' ? 'fullscreen' : lastWindowState
			});

			lastWindowState = currentState;
		});
	}
}
/**
 * Function to update the icon based on the URL
 * @param tabId Current tab id
 */
function updateIcon(tabId: chrome.tabs.Tab['id']) {
	if (typeof tabId === 'undefined') return;

	chrome.tabs.get(tabId, tab => {
		if (chrome.runtime.lastError) return;

		const icons = isTankTrouble(tab.url)
			? enabledIconPaths
			: disabledIconPaths;
		chrome.action.setIcon({ tabId, path: icons });
	});
}

/**
 * Event handler for onclick action.
 */
async function toggleMenu() {
	const tab = await getFocusedTab();

	if (tab === null) return;
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

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	if (changeInfo.status === 'complete') updateIcon(tabId);
});

// Listen for tab switches
chrome.tabs.onActivated.addListener((activeInfo) => {
	updateIcon(activeInfo.tabId);
});

// Listener for fetch requests from the content script
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

	return null;
});

//# HMRBackground
