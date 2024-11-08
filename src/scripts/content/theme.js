import { StoreEvent, get, onStateChange } from '../common/store.js';

/**
 * Set the page theme
 * @param theme Theme class identifier
 * @param prevTheme Old theme to remove from classlist
 * @param colorScheme Color scheme — should document be light or dark?
 */
const setTheme = (theme, prevTheme = null, colorScheme = 'light') => {
	if (prevTheme !== null) document.documentElement.classList.remove(prevTheme);

	document.documentElement.classList.add(theme);
	document.documentElement.setAttribute('data-color-scheme', colorScheme);
};

get('theme').then(({ classToken, colorScheme }) => {
	setTheme(classToken, null, colorScheme);
});

onStateChange(change => {
	const { detail } = change;

	if (
		detail?.type === StoreEvent.STORE_CHANGE
		&& detail.data
		&& detail.data.curr.theme ) {
		const { curr, prev } = detail.data;
		const { classToken, colorScheme } = curr.theme;
		const { classToken: prevClassToken } = prev.theme ?? null;

		setTheme(classToken, prevClassToken, colorScheme);
	}
});
