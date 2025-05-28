import { dispatchMessage } from './common/ipcBridge.js';

/**
 * When the user clicks the extension icon,
 * we toggle the addons menu on site
 */
dispatchMessage(null, {
	type: 'TOGGLE_MENU'
});
