import { ScriptHashes } from '../config/ScriptHashes.js';
import { debugHashes } from '../config/DeveloperConfig.js';
import Hasher from './utils/HashAlgorithm.js';
import Logger from './utils/Logger.js';

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
				script.src = t_url('script/injects/' + match);
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
