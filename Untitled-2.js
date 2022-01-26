(() => {
    const defaults = {
        pluginName: 'markdowner',

		tagWhitelist:        [
			'body', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h6', 'ul', 'li', 'ol',
			'p', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'strong', 'em', 'del',
			'ins', 'mark', 'sup', 'sub', 'img', 'br', 'abbr', 'hr', 'dl', 'dt', 'dd', 'u'
		],
		contentTagWhitelist: [ ],
		attributeWhitelist:  [ 'align', 'color', 'controls', 'href', 'src', 'alt', 'style', 'target', 'title', 'type' ],
		cssWhitelist:        [ 'color', 'background-color', 'font-size', 'text-align', 'text-decoration', 'font-weight' ],
		schemaWhiteList:     [ 'https:', 'data:' ],
		uriAttributes:       [ 'href' ],

        tags: {
            '': ['<em>', '</em>'],
            _: ['<strong>', '</strong>'],
            '*': ['<strong>', '</strong>'],
            '~': ['<s>', '</s>'],
            '\n': ['<br />'],
            ' ': ['<br />'],
            '-': ['<hr />']
        }
    }

	function outdent(string) {
		return string.replace(RegExp('^' + (string.match(/^(\t| )+/) || '')[0], 'gm'), '');
	}

	function encodeAttribute(string) {
		return (string + '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function parse(markdown) {
		let tokenizer = /((?:^|\r?\n+)(?:\r?\n---+|\* \*(?: \*)+)\r?\n)|(?:^``` *(\w*)\r?\n([\s\S]*?)\r?\n```$)|((?:(?:^|\r?\n+)(?:\t|  {2,}).+)+\r?\n*)|((?:(?:^|\r?\n)([>*+-]|\d+\.)\s+.*)+)|(?:!\[([^\]]*?)\]\(([^)]+?)\))|(\[)|(\](?:\(([^)]+?)\))?)|(?:(?:^|\r?\n+)([^\s].*)\r?\n(-{3,}|={3,})(?:\r?\n+|$))|(?:(?:^|\r?\n+)(#{1,6})\s*(.+)(?:\r?\n+|$))|(?:`([^`].*?)`)|(  \r?\n\r?\n*|\r?\n{2,}|(?<=\W|^|$)(?<![_*])__|__(?=\W|^|$)(?![_*])|(?<=\W|^|$)(?<![_*])\*\*|\*\*(?=\W|^|$)(?!\*\*|[_*])|(?<=\W|^|$)(?<![_*])[_*]|[_*](?=\W|^|$)(?![_*])|~~)|(?:<([^>]+?)>)|<[^>]+>/gm,
			context   = [],
			out       = $('<div>'),
			links     = {},
			last      = 0,
			chunk, prev, token, inner, t;

		function tag(token) {
			let desc  = defaults.tags[token[1] || ''];
			let end   = context[context.length - 1] == token;
			if (!desc) {
				return token;
			}
			if (!desc[1]) {
				return desc[0];
			}
			if (end) context.pop();
			else context.push(token);
			return desc[end | 0];
		}

		function flush() {
			let str   = '';
			while (context.length) str += tag(context[context.length - 1]);
			return str;
		}

		markdown = markdown.replace(/^\[(.+?)\]:\s*(.+)$/gm, (s, name, url) => {
			links[name.toLowerCase()] = url;
			return '';
		}).replace(/^\n+|\n+$/g, '');

		while ((token = tokenizer.exec(markdown))) {
			prev      = markdown.substring(last, token.index);
			last      = tokenizer.lastIndex;
			chunk     = token[0];
			if (prev.match(/[^\\](\\\\)*\\$/)) {
				// escaped
			}
			// Code/Indent blocks:
			else if (t = (token[3] || token[4])) {
				chunk = '<pre class="code ' + (token[4] ? 'poetry' : token[2].toLowerCase()) + '"><code' + (token[2] ? ` class="language-${token[2].toLowerCase()}"` : '') + '>' + outdent(encodeAttribute(t).replace(/^\n+|\n+$/g, '')) + '</code></pre>';
			}
			// > Quotes, -* lists:
			else if (t = token[6]) {
				if (t.match(/\./)) {
					token[5] = token[5].replace(/^\d+/gm, '');
				}
				inner = parse(outdent(token[5].replace(/^\s*[>*+.-]/gm, '')));
				if (t === '>') t = 'blockquote';
				else {
					t = t.match(/\./) ? 'ol' : 'ul';
					inner = inner.replace(/^(.*)(\n|$)/gm, '<li>$1</li>');
				}
				chunk = '<' + t + '>' + inner + '</' + t + '>';
			}
			// Images:
			else if (token[8]) {
				chunk = `<img src="${encodeAttribute(token[8])}" alt="${encodeAttribute(token[7])}">`;
			}
			// Links:
			else if (token[10]) {
				out = out.replace('<a>', `<a href="${encodeAttribute(token[11] || links[prev.toLowerCase()])}">`);
				chunk = flush() + '</a>';
			} else if (token[9]) {
				chunk = '<a>';
			}
			// Headings:
			else if (token[12] || token[14]) {
				t = 'h' + (token[14] ? token[14].length : (token[13] > '=' ? 1 : 2));
				chunk = '<' + t + '>' + parse(token[12] || token[15], links) + '</' + t + '>';
			}
			// `code`:
			else if (token[16]) {
				chunk = '<code>' + encodeAttribute(token[16]) + '</code>';
			}
			// Inline formatting: *em*, **strong** & friends
			else if (token[17] || token[1]) {
				chunk = tag(token[17] || '--');
			}
			out += prev;
			out += chunk;
		}

		return out;//(out + markdown.substring(last) + flush()).replace(/^\n+|\n+$/g, '');
	}
	$[defaults.pluginName] = parse;
})();

(() => {
	const makeSanitizedCopy = (node, iframedoc) => {
		const tagName = node.tagName && node.tagName.toLowerCase();
		let newNode;
		if (node.nodeType === Node.TEXT_NODE) {
			newNode = node.cloneNode(true);
		} else if (node.nodeType === Node.ELEMENT_NODE && (defaults.tagWhitelist.includes(tagName) || defaults.contentTagWhitelist.includes(tagName))) {
			if (defaults.contentTagWhitelist.includes(tagName)) {
				newNode = iframedoc.createElement('div');
			} else newNode = iframedoc.createElement(tagName);

			for (let i = 0, length = node.attributes.length; i < length; i++) { 
				const attribute = node.attributes[i];

				if (defaults.attributeWhitelist.includes(attribute.name)) {
					if (attribute.name === 'style') {

						for (let j = 0, len = node.style.length; j < len; j++) {
							const styleName = node.style[j];
							if (defaults.cssWhiteList.includes(styleName))
								newNode.style.setProperty(styleName, node.style.getPropertyValue(styleName));
						}

					} else {
						if (defaults.uriAttributes.includes(attribute.name)) {
							if (attribute.value.indexOf(':') > -1 && !startsWithAny(attribute.value, defaults.schemaWhiteList))
								continue;
						}
						newNode.setAttribute(attribute.name, attribute.value);
					}
				}
			}
			for (let i = 0, length = node.childNodes.length; i < length; i++) {
				newNode.appendChild(makeSanitizedCopy(node.childNodes[i], iframedoc));
			}
		} else {
			newNode = document.createDocumentFragment();
		}
		return newNode;
	}
	const startsWithAny = (string, substrings) => {
		for (let i = 0, length = substrings.length; i < length; i++) {
			if (string.indexOf(substrings[i]) === 0) {
				return true;
			}
		}
		return false;
	}
	const sanitize = (input, options) => {
		if (!input) return '';

		options = { ...defaults, ...options };

		// It's faster to create the iframe with vanilla JS, as you have to use the DOM element to get iframedoc, anyways.
		const iframe = document.createElement('iframe');
		iframe.sandbox = 'allow-same-origin allow-scripts';
		iframe.style.display = 'none';
		document.body.append(iframe);

		const iframedoc = iframe.contentDocument || iframe.contentWindow.document;
		iframedoc.body.innerHTML = input;

		const resultElement = $(makeSanitizedCopy(iframedoc.body, iframedoc)).liteLighter();
		document.body.removeChild(iframe);

		return resultElement[0].innerHTML
			.replace(/<br[^>]*>(\S)/g, '<br>\n$1');
	}

	$[defaults.pluginName] = sanitize;
})();