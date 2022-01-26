import ScriptHashes from '/config/ScriptHashes.js';
import { debugHashes } from '/config/DeveloperConfig.js';
import Hasher from '/js/utils/HashAlgorithm.js';
import Logger from '/js/utils/Logger.js';

const nodeData = document.querySelector('tanktroubleaddons'),
extensionURL = nodeData.dataset.url;

window.t_url = function(url) {
    return extensionURL + url;
}

// Change the native eval function and generate a hash of the script being evaluated.
const proxied = eval;
const hashLength = ScriptHashes.length;
let done =  0;
window.eval = function(code) {
    if (typeof code === 'string') {
        const codeHash = Hasher(code),
        match = ScriptHashes.hashes[codeHash],
        colour = match ? '#C0FF33' : '#FA113D';

        if (match) {
            done++;
            const script = document.createElement('script');
            script.src = t_url('js/injects/' + match + '?=_' + (Math.floor(Math.random() * 10_000_000) + 10_000_000));
            document.head.insertBefore(script, document.head.firstChild);
        }

        if (debugHashes && document.readyState === 'loading') {
            Logger.detailedLog(code, `%c[ %c${ codeHash } %c] %c${ done }/${ hashLength }`, `color: ${ colour }`, `color: #fff; font-weight: bold;`, `color: ${ colour }`, `color: ${ match ? colour : '#fff' }`);
        }
    }
    return proxied.apply(this, arguments);
}

Logger.log('Hasher loaded.');