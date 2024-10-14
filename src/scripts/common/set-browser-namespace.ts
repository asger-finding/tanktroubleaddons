/**
 * Aliases chrome as browser to normalise access between browsers
 */
export const setBrowserNamespace = () => {
	if (!('browser' in self)) (self as Window).browser = (self as Window).chrome;
};
