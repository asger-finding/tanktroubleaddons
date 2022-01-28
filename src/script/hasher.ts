import ScriptHashes from '../config/ScriptHashes.js';
import { debugHashes } from '../config/DeveloperConfig.js';
import Hasher from './utils/HashAlgorithm.js';
import Logger from './utils/Logger.js';

const nodeData = document.querySelector('tanktroubleaddons');
if (nodeData instanceof HTMLElement) {
	const extensionURL = nodeData.dataset.url;

	window.t_url = window.t_url || function(url: string) {
		return extensionURL + url;
	}

	const proxied = eval;
	const hashLength = ScriptHashes.hashesLength;
	let done =  0;
	window.eval = function(code: any) { /* Should be type of string, but TankTrouble might throw some errors */
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
