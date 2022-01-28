export default class Browser {
	static devtools = {
		chromium: {
			dark: {
				font_default:       '#e8eaed',
				font_dark:          '#80868b',
				font_warn:          '#f2ab26',
				font_error:         '#ff8080',
				background_default: '#202124',
				background_warn:    '#332b00',
				background_error:   '#290000'
			},
			light: {
				font_default:       '#202124',
				font_dark:          '#80868b',
				font_warn:          '#5c3c00',
				font_error:         '#ff0000',
				background_default: '#ffffff',
				background_warn:    '#fffbe5',
				background_error:   '#FFF0F0'
			}
		},
		safari: {
			dark: {
				font_default:       '#e0e0e0',
				font_dark:          '#a6a6a6',
				font_warn:          '#e5d254',
				font_error:         '#ef866d',
				background_default: '#363636',
				background_warn:    '#493c35',
				background_error:   '#4a3532'
			},
			light: {
				font_default:       '#000000',
				font_dark:          '#999999',
				font_warn:          '#a05c22',
				font_error:         '#ba3128',
				background_default: '#ffffff',
				background_warn:    '#fefae4',
				background_error:   '#fceceb'
			}
		},
		edge: {
			dark: {
				font_default:       '#ffffff',
				font_dark:          '#a6a6a6',
				font_warn:          '#f2ab26',
				font_error:         '#a7a7a7',
				background_default: '#242424',
				background_warn:    '#332b00',
				background_error:   '#290000'
			},
			light: {
				font_default:       '#1b1b1b',
				font_dark:          '#666666',
				font_warn:          '#5c3c00',
				font_error:         '#e10000',
				background_default: '#ffffff',
				background_warn:    '#fffbe5',
				background_error:   '#fff0f0'
			}
		},
		firefox: {
			dark: {
				font_default:       '#d7d7db',
				font_dark:          '#939395',
				font_warn:          '#f2ab26',
				font_error:         '#ffb3d2',
				background_default: '#232327',
				background_warn:    '#332b00',
				background_error:   '#4b2f36'
			},
			light: {
				font_default:       '#0c0c0d',
				font_dark:          '#737373',
				font_warn:          '#715100',
				font_error:         '#a4000f',
				background_default: '#ffffff',
				background_warn:    '#fffbd6',
				background_error:   '#fdf2f5'
			}
		},
		opera: {
			dark: {
				font_default:       '#e8eaed',
				font_dark:          '#80868b',
				font_warn:          '#f2ab26',
				font_error:         '#ff8080',
				background_default: '#202124',
				background_warn:    '#332b00',
				background_error:   '#290000'
			},
			light: {
				font_default:       '#202124',
				font_dark:          '#80868b',
				font_warn:          '#5c3c00',
				font_error:         '#ff0000',
				background_default: '#ffffff',
				background_warn:    '#fffbe5',
				background_error:   '#fff0f0'
			}
		},

		get generic() { return this.chromium },

		get font_default() {
			return this[Browser.browser][Browser.theme].font_default;
		},
		get font_dark() {
			return this[Browser.browser][Browser.theme].font_dark;
		},
		get font_warn() {
			return this[Browser.browser][Browser.theme].font_warn;
		},
		get font_error() {
			return this[Browser.browser][Browser.theme].font_error;
		},
		get background_default() {
			return this[Browser.browser][Browser.theme].background_default;
		},
		get background_warn() {
			return this[Browser.browser][Browser.theme].background_warn;
		},
		get background_error() {
			return this[Browser.browser][Browser.theme].background_error;
		}
	}

	static get browser() {
        const userAgent = navigator.userAgent;
    
        if (userAgent.match(/firefox|fxios/i))
            return 'firefox';
        else if (userAgent.match(/edg/i))
            return 'edge';
        else if (userAgent.match(/opr\//i)) 
            return 'opera';
        else if (userAgent.match(/chrome|chromium|crios/i))
            return 'chromium';
        else if (userAgent.match(/safari/i))
            return 'safari';
        else
            return 'generic';
    }

	static get theme() {
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
};
