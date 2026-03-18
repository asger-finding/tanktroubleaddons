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

let lastWindowState = 'normal' as chrome.windows.WindowState;

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
function isTankTrouble(url?: string) {
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
		const window = await browser.windows.get(windowId);
		const currentState = (window.state ?? 'normal') as chrome.windows.WindowState;

		await browser.windows.update(windowId, {
			state: state === 'on' ? 'fullscreen' : lastWindowState
		});

		lastWindowState = currentState; // eslint-disable-line require-atomic-updates
	}
}

/**
 * Function to update the icon based on the URL
 * @param tabId Current tab id
 */
async function updateIcon(tabId?: number) {
	if (typeof tabId === 'undefined') return;

	try {
		const tab = await browser.tabs.get(tabId);
		const icons = isTankTrouble(tab.url)
			? enabledIconPaths
			: disabledIconPaths;
		browser.browserAction.setIcon({ tabId, path: icons });
	} catch {
		// Tab may have been closed
	}
}

/**
 * Event handler for onclick action.
 */
async function toggleMenu() {
	const tab = await getFocusedTab();

	if (tab === null) return;
	if (typeof tab.id === 'undefined') return;

	if (isTankTrouble(tab.url)) {
		browser.tabs.executeScript(tab.id, {
			file: 'scripts/toggleMenu.js'
		});
	}
}

// Event to toggle menu when extension's button is clicked
browser.browserAction.onClicked.addListener(toggleMenu);

// Listen for tab updates
browser.tabs.onUpdated.addListener((tabId: number, changeInfo: { status?: string }) => {
	if (changeInfo.status === 'complete') updateIcon(tabId);
});

// Listen for tab switches
browser.tabs.onActivated.addListener((activeInfo: { tabId: number }) => {
	updateIcon(activeInfo.tabId);
});

// Listener for fetch requests from the content script
browser.runtime.onMessage.addListener((request: Record<string, unknown>) => {
	if (request.action === 'CORS_EXEMPT_FETCH' && request.resource) {
		const { resource, options, uuid } = request as { resource: string; options?: RequestInit; uuid?: string };

		const allowedOrigins = ['https://ironvault.vercel.app'];
		try {
			const url = new URL(resource);
			if (!allowedOrigins.includes(url.origin))
				return Promise.resolve({ success: false, error: `Disallowed origin: ${url.origin}` });

		} catch {
			return Promise.resolve({ success: false, error: 'Invalid URL' });
		}

		return fetch(resource, options || {})
			.then(response => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.json();
			})
			.then(data => ({ success: true, data, uuid }))
			.catch(error => ({ success: false, error: error.message ?? String(error) }));
	} else if (request.action === 'FULLSCREEN') {
		toggleFullscreen(request.state as 'on' | 'off' | undefined);
	}

	return null;
});

//# HMRBackground
