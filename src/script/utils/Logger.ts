import Browser from './Browser.js';

export default class Logger {
    static time(colour: string, ...args: string[]) {
        const date          = new Date();
        const styling       = args.splice(1);
        const hours         = (date.getHours() + '').padStart(2, '0');
        const minutes       = (date.getMinutes() + '').padStart(2, '0');
        const seconds       = (date.getSeconds() + '').padStart(2, '0');
        const milliseconds  = (date.getMilliseconds() + '');
        return [ (`%c${ hours }:${ minutes }:${ seconds }.${ milliseconds }`)
            .toString()
            .padEnd(14, '0') + '%c ' + args.join(''),
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
}
