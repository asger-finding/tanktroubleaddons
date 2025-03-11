import { dispatchMessage } from './common/ipcBridge.js';

dispatchMessage(null, {
	type: 'TOGGLE_MENU'
});
