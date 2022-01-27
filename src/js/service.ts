// event to run execute.js content when extension's button is clicked
chrome.action.onClicked.addListener(execScript);

async function execScript() {
	const tabId = await getTabId();
	console.log(chrome)
	chrome.scripting.executeScript({
		target: {
			tabId: tabId
		},
		files: [ 'js/execute.js' ]
	})
}

async function getTabId() {
	const tabs = await chrome.tabs.query({
		active: true,
		currentWindow: true
	});
	return (tabs.length > 0) ? tabs[0].id : null;
}
