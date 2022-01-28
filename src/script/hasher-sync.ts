interface Window {
    t_url: Function;
    opera: any;
    opr: any;
    safari: any;
    InstallTrigger: any;
}

/**
 !! TEMPORARY SOLUTION !!
 This sucks, I know. However, MV3 has a bug where it doesn't inject module scripts at runtime correctly.
 This can only be solved by injecting a regular JavaScript file.
 When patched, use hasher.js instead of this UTTER garbage.
 See: https://crbug.com/1054624, https://crbug.com/1207006.
 */

class ScriptHashes {
    static hashes = {
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
    
    // Garage
        '25ai7m0en1n': 'garage/uigarage.js',
        '4aecss92jt9': 'garage/uibootstate.js',
        '670ta48bvpg': 'garage/uipreloadstate.js',
        '0qc0ij6acu8': 'garage/uinousersstate.js',
        '77crp2q4o86': 'garage/uiloadstate.js',
        '6853dai20r9': 'garage/uimainstate.js',
    
    // TankTrouble Subclass
        '0fpg5uhiq8d': 'tanktrouble/controlsoverlay.js',
        '7dis0ah4fdg': 'tanktrouble/settingsbox.js',
        '3b70d6a5fnu': 'tanktrouble/chatbox.js',
    
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

    static get hashesLength() {
        return Object.keys(this.hashes).length;
    }
}

const Hasher = function (str: string, seed: number = 0) {
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
};

class Browser {
    static get browser() {
        if (Browser.isAnyChromium && !Browser.isEdge && !Browser.isEdge) {
            return 'chrome';
        } else if (Browser.isSafari) {
            return 'safari';
        } else if (Browser.isEdge) {
            return 'edge';
        } else if (Browser.isFirefox) {
            return 'firefox';
        } else if (Browser.isOpera) {
            return 'opera';
        } else {
            return 'unknown';
        }
    }

    static get isAnyChromium() {
        return !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
    }
    static get isSafari() {
        return typeof window.safari !== 'undefined';
    }
    static get isEdge() {
        return window.navigator.userAgent.includes('Edg/');
    }
    static get isFirefox() {
        return typeof window.InstallTrigger !== 'undefined';
    }
    static get isOpera() {
        return window.navigator.userAgent.includes('OPR/');
    }

    static get dark() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    static devtools = {
        firefox: {
            dark: {
                font_default: '#D7D7DB',
                font_dark: '#929295',
                font_warn: '#FCE2A1',
                font_error: '#FFB3D2',
                background_default: '#222227',
                background_warn: '#42391E',
                background_error: '#4A2E36',
                splitter: '#38393C'
            }
        },
        chrome: {
            dark: {
                    font_default: '#E8EAED',
                    font_dark: '#81878B',
                    font_warn: '#F3AA26',
                    font_error: '#FF8181',
                    background_default: '#202124',
                    background_warn: '#322B01',
                    background_error: '#280001',
                    splitter: '#3B3B3A'
            }
        },
        get font_default() {
            return Browser.dark ?
                this[Browser.browser].dark.font_default : '#FFFFFF';
        },
        get font_dark() {
            return Browser.dark ?
                this[Browser.browser].dark.font_dark : '#FFFFFF';
        },
        get font_warn() {
            return Browser.dark ?
                this[Browser.browser].dark.font_warn : '#FFFFFF';
        },
        get font_error() {
            return Browser.dark ?
                this[Browser.browser].dark.font_error : '#FFFFFF';
        },
        get background_default() {
            return Browser.dark ?
                this[Browser.browser].dark.background_default : '#FFFFFF';
        },
        get background_warn() {
            return Browser.dark ?
                this[Browser.browser].dark.background_warn : '#FFFFFF';
        },
        get background_error() {
            return Browser.dark ?
                this[Browser.browser].dark.background_error : '#FFFFFF';
        },
        get splitter() {
            return Browser.dark ?
                this[Browser.browser].dark.splitter : '#FFFFFF';
        }
    }
}

class Logger {
    static time(colour, ...args) {
        const date          = new Date();
        const styling       = args.splice(1);
        const hours         = (date.getHours() + '').padStart(2, '0');
        const minutes       = (date.getMinutes() + '').padStart(2, '0');
        const seconds       = (date.getSeconds() + '').padStart(2, '0');
        const milliseconds  = (date.getMilliseconds() + '');
        return [ (`%c${ hours }:${ minutes }:${ seconds }.${ milliseconds }`)
            .toString()
            .padEnd(12, '0') + '%c ' + args.join(''),
            'color: ' + colour, 'color: ' + Browser.devtools.font_default, ...styling ];
    }

    static log(...args) {
        console.log(...Logger.time(Browser.devtools.font_dark, ...args));
    }

    static error(...args) {
        console.error(...Logger.time(Browser.devtools.font_error, ...args));
    }

    static warn(...args) {
        console.warn(...Logger.time(Browser.devtools.font_warn, ...args));
    }

    static trace(...args) {
        console.trace(...Logger.time(Browser.devtools.font_dark, ...args));
    }

    static detailedLog(trace, ...args) {
        console.groupCollapsed(...Logger.time(Browser.devtools.font_dark, ...args));
        console.trace(trace);
        console.groupEnd();
    }
};


const debugHashes = false;

/** ---------- READ NOTE ABOVE ---------- **/

const nodeData = document.querySelector('tanktroubleaddons');
if (nodeData instanceof HTMLElement) {
    const extensionURL = nodeData.dataset.url;

    window.t_url = window.t_url || function(url) {
        return extensionURL + url;
    }

    const proxied = eval;
    const hashLength = ScriptHashes.hashesLength;
    let done =  0;
    window.eval = function(code) {
        if (typeof code === 'string') {
            const codeHash = Hasher(code),
            match = ScriptHashes.hashes[codeHash],
            colour = match ? '#C0FF33' : '#FA113D';

            if (match) {
                done++;
                const script = document.createElement('script');
                script.src = window.t_url('script/injects/' + match + '?=_' + (Math.floor(Math.random() * 10_000_000) + 10_000_000));
                document.head.insertBefore(script, document.head.firstChild);
            }

            if (debugHashes && document.readyState === 'loading') {
                Logger.detailedLog(code, `%c[ %c${ codeHash } %c] %c${ done }/${ hashLength }`, `color: ${ colour }`, `color: #fff; font-weight: bold;`, `color: ${ colour }`, `color: ${ match ? colour : '#fff' }`);
            }
        }
        return proxied.apply(this, arguments);
    }

    Logger.log('Hasher loaded.');
}
