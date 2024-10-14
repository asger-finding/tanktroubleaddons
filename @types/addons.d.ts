export const _isESmodule = true;

declare global {
	// eslint-disable-next-line init-declarations
	const browser: typeof chrome;

	export interface Window {
		browser: typeof browser;

		t_url: (url: string) => string;
		addons: {
			loader: string;
			extensionUrl: string;
		}
	}
}
