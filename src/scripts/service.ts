import { setBrowserNamespace } from './common/set-browser-namespace.js';
import { startSyncStore } from 'webext-sync';

setBrowserNamespace();

const defaultState = {
	storeVersion: 1,
	timesPopupOpened: 0
};

startSyncStore(defaultState).then(async syncStore => {
	let state = await syncStore.getState();

	syncStore.onChange((newState, prevState) => {
		state = newState;

		console.log('Times popup opened:', state.timesPopupOpened);
	});

	console.log('Background loaded! state: ', state);
});

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

//# HMRBackground
