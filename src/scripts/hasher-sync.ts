const ScriptHashes: { [key: string]: string } = {
    // Game
        // Logic
            '7pqp95akl2s': 'game/gamemanager.js',
            '0ac4orarafp': 'game/roundcontroller.js',
            '759lcq3cnf3': 'game/roundmodel.js',
        // State
            '53vmeku41jh': 'game/tankstate.js',
            '5aju874idin': 'game/roundstate.js',
            '6bskh8jgbvt': 'game/gamestate.js',
        // Visual
            '1qnhb5p83ia': 'game/uibootstate.js',
            '6dsfjkq9b39': 'game/uipreloadstate.js',
            '1djlm2bho0c': 'game/uimenustate.js',
            '5ei63orc5dp': 'game/uigamestate.js',
            // Graphics
                '7kkf526noq0': 'game/uiaimergraphics.js',
                '6pk8me3pr3n': 'game/uimissileimage.js',
                '74t9acc1k30': 'game/uilasergraphics.js',
                '7ea9n5arpk7': 'game/uiweaponsymbolgroup.js',
                '61fneaqu1ae': 'game/uiweaponiconimage.js',
                '26fgvgmqejg': 'game/uiprojectileimage.js',
                '4s1e60j5ip5': 'game/uitanksprite.js',
                '79t0bcq6rh9': 'game/uitanknamegroup.js',
                '4uah8gerp9k': 'game/uirubblegroup.js',
				'21d88dl4658': 'game/uiwaitingicongroup.js',
				'1jd8o7ds8kl': 'game/uigoldsprite.js',
				'7cqcknebrne': 'game/uidisconnectedicongroup.js',
				'74qd7c8v3qk': 'game/uidiamondsprite.js',
				'5bgbfh5u5co': 'game/uiscrollergroup.js',
				'38jn72qefq3': 'game/uicounterovertimegroup.js',
				'2hmkadutpeo': 'game/uirubblefragmentsprite.js',
				'1p7149tcc8d': 'game/uidimitrispine.js',
				'48rbpetm60o': 'game/uilaikaspine.js',
				'30sekr5ktbt': 'game/uicelebrationtrophygroup.js',
				'7c3jtup88um': 'game/uimenubackgroundgroup.js',
				'4s8dlp8jc4m': 'game/uidiamondshinegroup.js',
				'00bqsan71m2': 'game/uispawnzonesprite.js',
				'7icm32cg4e4': 'game/uishieldsprite.js',
				'4g7ekh8n15b': 'game/uiconfettiparticle.js',
				'1b3lpu5117h': 'game/uistreamergraphics.js',
				'6tmeace3knt': 'game/uiexplosionfragmentsprite.js',
				'5di547q5go4': 'game/uichatsymbolimage.js',
    
    // Garage
        '25ai7m0en1n': 'garage/uigarage.js',
        '4aecss92jt9': 'garage/uibootstate.js',
        '670ta48bvpg': 'garage/uipreloadstate.js',
        '0qc0ij6acu8': 'garage/uinousersstate.js',
        '77crp2q4o86': 'garage/uiloadstate.js',
        '6853dai20r9': 'garage/uimainstate.js',
		'56ftnvejp79': 'garage/garageoverlay.js',
    
    // TankTrouble Subclass
        '0fpg5uhiq8d': 'tanktrouble/controlsoverlay.js',
        '7dis0ah4fdg': 'tanktrouble/settingsbox.js',
        '3b70d6a5fnu': 'tanktrouble/chatbox.js',
        '0nhlbb8q68p': 'tanktrouble/virtualshopoverlay.js',
        '48m8678bii0': 'tanktrouble/adminplayerlookupoverlay.js',
        '516f18jgeem': 'tanktrouble/statistics.js',
    
        // Connection
        '56i8ao2nvf2': 'connection/ttclient.js',
        '374q3ksrqui': 'connection/clientmanager.js',
    
    // Player Panel
        '0sm9hrm0d0s': 'playerpanel/uiplayerpanel.js',
        '5uies3u5424': 'playerpanel/uibootstate.js',
        '2t4sgkdecm4': 'playerpanel/uipreloadstate.js',
        '5d0cm3ngrsr': 'playerpanel/uimainstate.js',
        // Tank Icon
            '65l23pgcn3m': 'playerpanel/uitankicon.js',
            '25e5c7of7ts': 'playerpanel/uitankiconloader.js',
            '1ckatud4umf': 'playerpanel/uitankiconimage.js',
            '0cevgp8k5a3': 'playerpanel/uitankiconloginimage.js',
            '4993mfvn24n': 'playerpanel/uitankavatargroup.js',
    
    // Inputs
        '34fmc83grn0': 'inputs/inputs.js',
        '6h043lvill0': 'inputs/inputmanager.js',
        '2c6lucmqmj4': 'inputs/keyboardinputmanager.js',
        '1tdudtdnitr': 'inputs/mouseinputmanager.js',
    
    // AI
        '06uom87q8t8': 'ai/aimanager.js',
        '612p2i0logf': 'ai/ais.js',
        '0cl4b58a6rg': 'ai/ai.js',
    
    // Maze
        '2svckk2geb4': 'maze/mazethememanager.js',
        '50u4al9isnr': 'maze/maze.js',
    
    // Utils
        '355rof3sk2c': 'utils/utils.js',
        '609n2v5ibq3': 'utils/b2dutils.js',
        '271tbbc6cos': 'utils/aiutils.js',
        '34visp9ckt4': 'utils/uiutils.js',
    
    // Managers
        '11m3onjol17': 'managers/focusmanager.js',
        '7dinv9lgtda': 'managers/overlaymanager.js',
        '5h59m7opcog': 'managers/premiummanager.js',
        '19th5lqtvv6': 'managers/qualitymanager.js',
    
    // Classes
        '6v200sak2qq': 'classes/users.js',
        '3ip0fdausiq': 'classes/content.js',
        '7nqmob1fehq': 'classes/constants.js',
        '697ii87vo0r': 'classes/uiconstants.js'
}

const Hasher = function(str: string, seed = 0) {
    let h1 = 0xDeadBeef ^ seed,
        h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(32).padStart(11, '0')
}

class Browser {
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
}

class Logger {
    static time(colour: string, ...args: string[]) {
        const date: Date           = new Date();
        const styling:string[]     = args.splice(1);
        const hours: string        = (date.getHours() + '').padStart(2, '0');
        const minutes: string      = (date.getMinutes() + '').padStart(2, '0');
        const seconds: string      = (date.getSeconds() + '').padStart(2, '0');
        const milliseconds: string = (date.getMilliseconds() + '');
        return [ (`%c${ hours }:${ minutes }:${ seconds }.${ milliseconds }`)
            .toString()
            .padEnd(14, '0') + '%c ' + args.join(''),
            'color: ' + colour, 'color: ' + Browser.devtools.font_default, ...styling ];
    }

    static log(...args: string[]) {
        console.log(...Logger.time(Browser.devtools.font_dark, ...args));
    }

    static error(...args: string[]) {
        console.error(...Logger.time(Browser.devtools.font_error, ...args));
    }

    static warn(...args: string[]) {
        console.warn(...Logger.time(Browser.devtools.font_warn, ...args));
    }

    static trace(...args: string[]) {
        console.trace(...Logger.time(Browser.devtools.font_dark, ...args));
    }

    static detailedLog(trace: string | null, ...args: string[]) {
        console.groupCollapsed(...Logger.time(Browser.devtools.font_dark, ...args));
        console.trace(trace);
        console.groupEnd();
    }
}

const debugHashes = false;

const nodeData = document.querySelector('tanktroubleaddons');
if (nodeData instanceof HTMLElement) {
	const extensionURL: string = nodeData.dataset.url;
	window.t_url = function(url: string) {
		return extensionURL + url;
	}

	const t_url = window.t_url;
	const proxied: Function = eval;
	const hashLength: number = Object.keys(ScriptHashes).length;
	let done = 0;

	window.eval = function(...code: string[]) {
		for (let i = 0; i < code.length; i++) {
			const codeHash: string = Hasher(code[i]);
			const match: string = ScriptHashes[codeHash];
			const colour: string = match ? '#C0FF33' : '#FA113D';

			if (match) {
				done++;
				const script: HTMLScriptElement = document.createElement('script');
				script.src = t_url('scripts/injects/' + match);
				document.head.insertBefore(script, document.head.firstChild);
			}

			if (debugHashes && document.readyState === 'loading') {
				Logger.detailedLog(code[0], `%c[ %c${ codeHash } %c] %c${ done }/${ hashLength }`, `color: ${ colour }`, `color: #fff; font-weight: bold;`, `color: ${ colour }`, `color: ${ match ? colour : '#fff' }`);
			}
		}
		return proxied.apply(this, code);
	}
	Logger.log('Hasher loaded.');
}
