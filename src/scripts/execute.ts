import { startSyncStore } from 'webext-sync';

startSyncStore().then(async syncStore => {
	let state = await syncStore.getState();

	syncStore.onChange((newState, prevState) => {
		state = newState;
	});

	console.log('Extension icon clicked! state:', state);

	syncStore.setState({ timesPopupOpened: state.timesPopupOpened++ });
});

// This code will be executed when the extension's button is clicked
console.log('execute.js executed');
