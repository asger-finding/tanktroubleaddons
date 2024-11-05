import { StoreEvent, get, onStateChange } from '../common/store.js';

get('theme').then(theme => {
	document.documentElement.classList.add(theme);
});

onStateChange(change => {
	const { detail } = change;
	if (!detail) return;

	if (detail.type === StoreEvent.STORE_CHANGE) {
		const { curr, prev } = detail.data;

		if ('theme' in curr && 'theme' in prev) {
			document.documentElement.classList.remove(prev.theme);
			document.documentElement.classList.add(curr.theme);
		}
	}
});
