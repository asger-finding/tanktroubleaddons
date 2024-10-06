export {};

declare global {
	export interface Window {
		t_url: (url: string) => string;
		addons: {
			loader: string;
			extensionUrl: string;
		}
	}
}
