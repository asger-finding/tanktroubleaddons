/**
 * FIXME: All of these plugins and the markdown parser should be in a jQuery module.
 * This isn't possible as the forum module isn't a regular mod_pagespeed script and doesn't go through eval like the other scripts.
 * Instead, we declare it as a redirect rule 
 */

(function() {
	class MDParser {
		static pluginName = 'snarkdown';

		static defaults = {
			tags: {
				'':   ['<em>', '</em>'],
				_:    ['<strong>', '</strong>'],
				'*':  ['<strong>', '</strong>'],
				'~':  ['<s>', '</s>'],
				'-':  ['<hr/>']
			},
			whitelist: {
				href: [ 'http', 'https', 'mailto' ]
			}
		}

		static outdent(string) {
			return string.replace(RegExp(`^${ (string.match(/^(\t| )+/) || '')[0] }`, 'gm'), '');
		}

		static encodeAttribute(string) {
			return string.replace(RegExp(`^${ (string.match(/^(\t| )+/) || '')[0] }`, 'gm'), '');
		}

		static parse(md) {
			const context   = [];
			const links     = {};
			const tokenizer = /((?:^|\r?\n+)(?:\r?\n---+|\* \*(?: \*)+)\r?\n)|(?:^``` *(\w*)\r?\n([\s\S]*?)\r?\n```$)|((?:(?:^|\r?\n+)(?:\t|  {2,}).+)+\r?\n*)|((?:(?:^|\r?\n)([>*+-]|\d+\.)\s+.*)+)|(?:!\[([^\]]*?)\]\(([^)]+?)\))|(\[)|(\](?:\(([^)]+?)\))?)|(?:(?:^|\r?\n+)([^\s].*)\r?\n(-{3,}|={3,})(?:\r?\n+|$))|(?:(?:^|\r?\n+)(#{1,6})\s*(.+)(?:\r?\n+|$))|(?:`([^`].*?)`)|( {2}\r?\n\r?\n*|\r?\n{2,}|(?<=\W|^|$)(?<![_*])__|__(?=\W|^|$)(?![_*])|(?<=\W|^|$)(?<![_*])\*\*|\*\*(?=\W|^|$)(?!\*\*|[_*])|(?<=\W|^|$)(?<![_*])[_*]|[_*](?=\W|^|$)(?![_*])|~~)|(?:<([^>]+?)>)|<[^>]+>/gm;
			let out         = '';
			let last        = 0;
			let chunk, prev, token, t;
			
			function tag(token) {
				let desc  = MDParser.defaults.tags[token[1] || ''];
				let end   = context[context.length - 1] == token;
	
				if (!desc) return token;
				if (!desc[1]) return desc[0];
				end ? context.pop() : context.push(token);
				
				return desc[end | 0];
			}
	
			function flush() {
				let str   = '';
				while (context.length) str += tag(context[context.length - 1]);
				return str;
			}
	
			md = md.replace(/^\[(.+?)\]:\s*(.+)$/gm, (s, name, url) => {
				links[name.toLowerCase()] = url;
				return '';
			}).replace(/^\n+|\n+$/g, '');
	
			while ((token = tokenizer.exec(md))) {
				prev      = md.substring(last, token.index);
				last      = tokenizer.lastIndex;
				chunk     = token[0];
				
				if (prev.match(/[^\\](\\\\)*\\$/)) {
					// escaped
				}
	
				// Code/Indent blocks
				else if ((t = (token[3] || token[4]))) {
					chunk = '<pre><code' + (token[2] ? ` llang="${token[2].toLowerCase()}"` : '') + '>' + MDParser.outdent(MDParser.encodeAttribute(t).replace(/^\n+|\n+$/g, '')) + '</code></pre>';
				}
	
				// Images
				else if (token[8]) {
					chunk = `<img src="${ MDParser.encodeAttribute(token[8]) }" alt="${ MDParser.encodeAttribute(token[7]) }">`;
				}
	
				// Links
				else if (token[10]) {
					let tkn = token[11] || links[prev.toLowerCase()];
					if (tkn && !MDParser.defaults.whitelist.href.includes(tkn.toLowerCase().slice(0, tkn.indexOf(':')))) {
						tkn = 'javascript:void(0);';
					}
					out = out.replace('<a>', `<a ${ tkn ? `href="${ MDParser.encodeAttribute(tkn) }"` : '' }>`);
					chunk = flush() + '</a>';
				} else if (token[9]) chunk = '<a>';
			
				// Headings
				else if (token[12] || token[14]) {
					t = 'h' + (token[14] ? token[14].length : (token[13] > '=' ? 1 : 2));
					chunk = `<${t}>${ MDParser.parse(token[12] || token[15], links) }</${t}>`;
				}
	
				// `code`:
				else if (token[16]) {
					chunk = `<code>${ MDParser.encodeAttribute(token[16]) }</code>`;
				}
	
				// Inline formatting: *em*, **strong** & friends
				else if (token[17] || token[1]) {
					chunk = tag(token[17] || '--');
				}
				out += prev;
				out += chunk;
			}
			return (out + md.substring(last) + flush()).replace(/^\n+|\n+$/g, '');
		}

		static parseAndSanitize(markdown) {
			const parsed = $('<div>').html(MDParser.parse(markdown
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#039;')
			));
	
			parsed.find('code').html(function() {
				let highlighed;
				const lang = this.getAttribute('llang');
				if (lang) {
					highlighed = $.liteLighter(this.innerHTML, { language: lang });
				}
				return highlighed || this.innerHTML;
			});
			
			return parsed;
		}
	}

	$[MDParser.pluginName] = function(markdown) {
		return MDParser.parseAndSanitize(markdown);
	}
})();

(($) => {
	class LiteLighter {
		static pluginName = 'liteLighter';

		static defaults = {
			style:      'light',
			language:   'generic'
		}

		static styles = {
			light: { // Adaptation of VS Code Light theme
				code:      'color: #000000;',
				comment:   'color: #009900;',
				string:    'color: #990000;',
				number:    'color: #993333;',
				keyword:   'color: #0000FF;',
				operators: 'color: #0000CC;',
				brackets:  'color: #CC66CC;'
			},
			dark: { // Adaptation of Monokai Dimmed
				code:      'color: #996699;',
				comment:   'color: #999999;',
				string:    'color: #999933;',
				number:    'color: #6699CC;',
				keyword:   'color: #6699CC;',
				operators: 'color: #666666;',
				brackets:  'color: #FFCC00;'
			}
		}

		static languages = {
			// JavaScript
			generic: {
				comment:   { re: /(\/\/.*|\/\*([\s\S]*?)\*\/)/g, style: 'comment' },
				string:    { re: /(('.*?')|(`.*?`)|(".*?"))/g, style: 'string' },
				numbers:   { re: /(-?(\d+|\d+\.\d+|\.\d+))/g, style: 'number' },
				regex:     { re: /([^/]\/[^/].+\/(g|i|m)*)/g, style: 'number' },
				keywords:  { re: /(?:\b)(do|if|for|let|new|try|var|case|else|with|await|break|catch|class|const|super|throw|while|yield|delete|export|import|return|switch|default|extends|finally|continue|debugger|function|arguments|constructor|false|from|get|in|instanceof|null|set|symbol|this|true|typeof|undefined|void|async|of)(?:\b)/gi, style: 'keyword' },
				operators: { re: /(\+|-|!|\/|\*|%|=|&lt;|&gt;|\||\?|\.)/g, style: 'operators' },
				brackets:  { re: /(\{|\}|\(|\))/g, style: 'brackets' }
			},
			get js() { return this.generic; },
			get javascript() { return this.generic; },
			// CSS
			css: {
				comment:   { re: /(\/\/.*|\/\*([\s\S]*?)\*\/)/g, style: 'comment' },
				string:    { re: /(('.*?')|(`.*?`)|(".*?"))/g, style: 'string' },
				numbers:   { re: /((-?(\d+|\d+\.\d+|\.\d+)(%|px|em|pt|in)?)|#[0-9a-fA-F]{3}[0-9a-fA-F]{3})/g, style: 'number' },
				keywords:  { re: /(@\w+|:?:\w+|[a-z-]+:)/g, style: 'keyword' },
				brackets:  { re: /(\{|\}|\(|\))/g, style: 'brackets' }
			},
			// HTML
			html: {
				comment:   { re: /(&lt;!--([\s\S]*?)--&gt;)/g, style: 'comment' },
				tag:       { re: /(&lt;\/?\w(.|\n)*?\/?&gt;)/g, style: 'keyword', embed: ['string'] },
				string:    { re: /(('.*?')|(`.*?`)|(".*?"))/g, style: 'string' },
				css:       { re: /(?:&lt;style.*?&gt;)([\s\S]+?)(?:&lt;\/style&gt;)/gi, language: 'css'},
				script:    { re: /(?:&lt;script.*?&gt;)([\s\S]+?)(?:&lt;\/script&gt;)/gi, language: 'js'}
			}
		}

		static highlight(text, options) {
			const language = LiteLighter.languages[options.language?.toLowerCase()] || LiteLighter.languages.generic;
			const style = LiteLighter.styles[options.style?.toLowerCase()] || LiteLighter.styles.light;

			return LiteLighter._highlight(text, language, style);
		}

		static _highlight(text, language, style) {
			let sublangsi = 0;
			const sublangs = [];
			for (const i in language) {
				if (Object.hasOwn(language, i) && language[i].language !== undefined && LiteLighter.languages[language[i].language] !== undefined) {
					text = text.replace(language[i].re, function ($1, $2) {
						sublangs[sublangsi++] = LiteLighter._highlight($2, LiteLighter.languages[language[i].language], style);
						return $1.replace($2, `___subtmpl${ sublangsi-1 }___`);
					});
				}
			}

			for (const i in language) {
				if (Object.hasOwn(language, i) && language[i].language === undefined) {
					text = text.replace(language[i].re, `___${ i }___$1___end${ i }___`);
				}
			}

			const lvls = [];
			text = text.replace(/___(?!subtmpl)\w+?___/g, function ($0) {
				const end = ($0.substr(3, 3) === 'end') ? true : false,
					tag = (!end ? $0.substr(3) : $0.substr(6)).replace(/_/g, ''),
					lastTag = lvls.length > 0 ? lvls[lvls.length - 1] : null;

				if (!end && (lastTag === null || tag === lastTag || (lastTag != null && language[lastTag].embed != undefined && $.inArray(tag, language[lastTag].embed) >= 0))) {
					lvls.push(tag);
					return $0;
				} else if (end && tag === lastTag) {
					lvls.pop();
					return $0;
				}
				return '';
			});
			for (const i in language) {
				if (Object.hasOwn(language, i)) {
					text = text.replace(new RegExp(`___end${ i }___`, 'g'), '</span>').replace(new RegExp(`___${ i }___`, 'g'), `<span class="litelighterstyle" style="${ style[language[i].style] }">`);
				}
			}

			for (const i in language) {
				if (Object.hasOwn(language, i) && language[i].language !== undefined && LiteLighter.languages[language[i].language] !== undefined) {
					text = text.replace(/___subtmpl\d+___/g, function ($tmpl) {
						const i = parseInt($tmpl.replace(/___subtmpl(\d+)___/, '$1'), 10);
						return sublangs[i];
					});
				}
			}
			return text;
		}
	}

	$[LiteLighter.pluginName] = function(text, options) {
		return LiteLighter.highlight(text, options);
	}
})(jQuery);

(($) => {
	class MDEditor {
		static pluginName = 'mdeditor';
		static defaults = {
			header: '.header',
			textarea: 'textarea'
		}
		static Constants = {
			MARKDOWN: 1,
			PREVIEW: 2,
			SELECTION_ALL: 1,          // Select all text of md wrapper
			SELECTION_NONE: 2,         // Select nothing
			SELECTION_INSIDE: 3,       // Select all text inside md wrapper
			SELECTION_BEFORE_START: 5, // Select before md wrapper start
			SELECTION_AFTER_START: 6,  // Select after md wrapper start
			SELECTION_BEFORE_END: 7,   // Select before md wrapper end
			SELECTION_AFTER_END: 8,    // Select after md wrapper end
            TOOLBAR_CLASS: 'mdeditor-toolbar',
            PREVIEW_CLASS: 'mdeditor-preview',
			PREVIEW_EMPTY_CLASS: 'mdeditor-preview-empty',
            TOOL_CLASS: 'mdeditor-toolbar-tool',
            SEPERATOR_CLASS: 'mdeditor-toolbar-seperator',
		}
		static toolbar = {
			'Preview Markdown': { display: 'preview.svg', type: MDEditor.Constants.PREVIEW, selection: MDEditor.Constants.SELECTION_NONE, seperator: true },
			'Heading Level 3':  { start: '## ',           end: '',         display: 'heading.svg',         type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE                     },
			'Bold':             { start: '**',            end: '**',       display: 'bold.svg',            type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE                     },
			'Italic':           { start: '*',             end: '*',        display: 'italic.svg',          type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE                     },
			//'Underline':      { start: '<u>',           end: '</u>',     display: 'underline.svg',       type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE                     },
			'Strikethrough':    { start: '~~',            end: '~~',       display: 'strikethrough.svg',   type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE,    seperator: true },
			'Embed image':      { start: '![<caption>](', end: ')',        display: 'image.svg',           type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE                     },
			'Clickable link':   { start: '[<text>][(',    end: ')',        display: 'link.svg',            type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE,    seperator: true },
			//'Superscript':    { start: '<sup>',         end: '</sup>',   display: 'superscript.svg',     type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE                     },
			//'Subscript':      { start: '<sub>',         end: '</sub>',   display: 'subscript.svg',       type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE                     },
			//'Highlight':      { start: '<mark>',        end: '</mark>',  display: 'highlight.svg',       type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE                     },
			'Code':             { start: '`',             end: '`',        display: 'code.svg',            type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE                     },
			'Code Block':       { start: '```\n',         end: '\n```',    display: 'codeblock.svg',       type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_INSIDE,    seperator: true },
			'Horizontal Rule':  { start: '\n---\n\n',     end: '',         display: 'horizontal-rule.svg', type: MDEditor.Constants.MARKDOWN,    selection: MDEditor.Constants.SELECTION_AFTER_END                  }
		}

		constructor(element, options) {
			this.options = {
				...MDEditor.defaults,
				...options
			};
			this.textarea = $(element);
			this.toolbar = $(`<div class="${ MDEditor.Constants.TOOLBAR_CLASS }"></div>`);
			this.preview = $(`<div class="${ MDEditor.Constants.PREVIEW_CLASS }"></div>`);

			this.generateTools();

			this.textarea.before(this.toolbar);
			this.textarea.after(this.preview);

			this.preview.toggle();
		}

		// Script has attempted to reconstruct an already initialized editor instance. We make it seem like it's just been initialized.
		reconstruct() {
			this.textarea.show();
			this.preview.hide();
		}

		generateTools() {
			$.each(MDEditor.toolbar, (name, data) => {
				const tool = $(`<div class="${ MDEditor.Constants.TOOL_CLASS }"></div>`);

				if (data.display.endsWith('.svg')) {
					$.get(t_url('assets/svg/' + data.display), function(result) {
						tool.append(result);
					}, 'text');
				} else {
					tool.text(data.display);
				}

				tool.tooltipster({
					position: 'top'
				});
				tool.tooltipster('content', name);
				tool.on('mouseup', (evt) => {
					evt.preventDefault();

					if (data.type === MDEditor.Constants.MARKDOWN) {
						this.markdownString(data.selection, data.start, data.end);

					} else if (data.type === MDEditor.Constants.PREVIEW) {
						this.preview.empty();
						this.preview.add(this.textarea).toggle();
						let parsed = $.snarkdown(this.textarea.val());
						if (!parsed.text()) 
							parsed = $(`<div class="${ MDEditor.Constants.PREVIEW_EMPTY_CLASS  }">Nothing to preview yet...</div>`);
						
						this.preview.html(parsed);
						tool.toggleClass('active');
					}
				});

				this.toolbar.append(tool);
				if (data.seperator) {
					this.toolbar.append(`<div class="${ MDEditor.Constants.SEPERATOR_CLASS }"></div>`);
				}
			});
		}

		add(startSyntax, endSyntax, start, end, val = this.textarea.val()) {
			return val.slice(0, start) +
				startSyntax +
				val.slice(start, end) +
				endSyntax + val.slice(end);
		}

		markdownString(selectionType, startSyntax, endSyntax, { start, end } = this.selection) {
			this.textarea.val(this.add(startSyntax, endSyntax, start, end));
			this.textarea.trigger('input.resize');
			this.setSelection(selectionType, { start, end, startLen: startSyntax.length, endLen: endSyntax.length });
		}

		setSelection(selectionType, params) {
			let index = { start: 0, end: 0 };

			switch (selectionType) {
				case MDEditor.Constants.SELECTION_ALL: {
					index.start = params.start;
					index.end   = params.end + params.startLen + params.endLen;
					break;
				}
				case MDEditor.Constants.SELECTION_NONE: {
					this.textarea.blur();
					return;
				}
				case MDEditor.Constants.SELECTION_INSIDE: {
					index.start = params.start + params.startLen;
					index.end   = params.end + params.startLen;
					break;
				}
				case MDEditor.Constants.SELECTION_BEFORE_START: {
					index.start = params.start;
					index.end   = index.start;
					break;
				}
				case MDEditor.Constants.SELECTION_AFTER_START: {
					index.start = params.start + params.startLen;
					index.end   = index.start;
					break;
				}
				case MDEditor.Constants.SELECTION_BEFORE_END: {
					index.start = params.end + params.startLen;
					index.end   = index.start;
					break;
				}
				case MDEditor.Constants.SELECTION_AFTER_END: {
					index.start = params.end + params.startLen + params.endLen;
					index.end   = index.start;
					break;
				}
			}
			this.textarea.focus();
			this.textarea.get(0).setSelectionRange(index.start, index.end);
		}

		get selection() {
			return {
				start: this.textarea.prop('selectionStart'),
				end: this.textarea.prop('selectionEnd')
			}
		}

		get previewing() {
			return this.preview.is(':visible');
		}
	}

	$.fn[MDEditor.pluginName] = function (options) {
		return this.each(function () {
			if (!$.data(this, MDEditor.pluginName)) {
				$.data(this, MDEditor.pluginName, new MDEditor(this, options));
			} else {
				$.data(this, MDEditor.pluginName).reconstruct();
			}
		});
	};
})(jQuery);

var ForumModel = Classy.newClass().name('ForumModel');

ForumModel.constructor(function() {});

ForumModel.fields({
    replyListChangeListeners: [],
    threadListChangeListeners: [],
    currentThreads: [],
    currentReplies: [],
    currentThreadWindowMinTime: Number.POSITIVE_INFINITY,
    currentThreadWindowMaxTime: Number.NEGATIVE_INFINITY,
    currentThreadWindowMinPinned: Number.POSITIVE_INFINITY,
    currentThreadWindowMaxPinned: Number.NEGATIVE_INFINITY,
    currentThreadWindowNewestId: 0,
    currentThreadWindowOldestId: 0,
    currentReplyWindowNewestId: 0,
    currentReplyWindowOldestId: 0,
    threadCount: 0,
    threadOffset: 0,
    threadRequestSize: 10,
    trackingNewestThreads: false,
    selectedThread: null,
    selectedThreadReplyCount: 0,
    selectedThreadReplyOffset: 0,
    threadBeingEdited: null,
    replyRequestSize: 10,
    trackingNewestReplies: false,
    replyBeingEdited: null
});

ForumModel.methods({

    addThreadListChangeListener: function(obj) {
        this.threadListChangeListeners.push(obj);
    },

    addReplyListChangeListener: function(obj) {
        this.replyListChangeListeners.push(obj);
    },

    getCurrentThreadWindowNewestThreadId: function() {
        return this.currentThreadWindowNewestId;
    },

    getCurrentReplyWindowOldestId: function() {
        return this.currentReplyWindowOldestId;
    },

    getThreadRequestSize: function() {
        return this.threadRequestSize;
    },

    getReplyRequestSize: function() {
        return this.replyRequestSize;
    },

    getTrackingNewestThreads: function() {
        return this.trackingNewestThreads;
    },

    getTrackingNewestReplies: function() {
        return this.trackingNewestReplies;
    },

    notifyThreadListChangeListenersReplyUpdated: function(reply) {
        for (let i = 0;i<this.replyListChangeListeners.length;i++) {
            this.replyListChangeListeners[i].replyUpdated(reply);
        }
    },

    notifyThreadListChangeListenersThreadListChanged: function(animate) {
        for (let i = 0;i<this.threadListChangeListeners.length;i++) {
            this.threadListChangeListeners[i].threadListChanged(this.currentThreads, animate);
        }
    },

    notifyThreadListChangeListenersThreadUpdated: function(thread) {
        for (let i = 0;i<this.threadListChangeListeners.length;i++) {
            this.threadListChangeListeners[i].threadUpdated(thread);
        }
    },

    notifyThreadListChangeListenersThreadSelected: function(threadId) {
        for (let i = 0;i<this.threadListChangeListeners.length;i++) {
            this.threadListChangeListeners[i].threadSelected(threadId);
        }
    },

    notifyThreadListChangeListenersThreadDeselected: function() {
        for (let i = 0;i<this.threadListChangeListeners.length;i++) {
            this.threadListChangeListeners[i].threadDeselected();
        }
    },

    notifyThreadListChangeListenersThreadEditStarted: function(threadId) {
        for (let i = 0;i<this.threadListChangeListeners.length;i++) {
            this.threadListChangeListeners[i].threadEditStarted(threadId);
        }
    },

    notifyThreadListChangeListenersThreadEditFinished: function(thread) {
        for (let i = 0;i<this.threadListChangeListeners.length;i++) {
            this.threadListChangeListeners[i].threadEditFinished(thread);
        }
    },

    notifyThreadListChangeListenersThreadEditCancelled: function() {
        for (let i = 0;i<this.threadListChangeListeners.length;i++) {
            this.threadListChangeListeners[i].threadEditCancelled();
        }
    },

    notifyReplyListChangeListenersReplyListChanged: function(animate) {
        for (let i = 0;i<this.replyListChangeListeners.length;i++) {
            this.replyListChangeListeners[i].replyListChanged(this.currentReplies, animate);
        }
    },

    notifyReplyListChangeListenersReplyEditStarted: function(replyId) {
        for (let i = 0;i<this.replyListChangeListeners.length;i++) {
            this.replyListChangeListeners[i].replyEditStarted(replyId);
        }
    },

    notifyReplyListChangeListenersReplyEditFinished: function(reply) {
        for (let i = 0;i<this.replyListChangeListeners.length;i++) {
            this.replyListChangeListeners[i].replyEditFinished(reply);
        }
    },

    notifyReplyListChangeListenersReplyEditCancelled: function() {
        for (let i = 0;i<this.replyListChangeListeners.length;i++) {
            this.replyListChangeListeners[i].replyEditCancelled();
        }
    },

    /**
     * Merge a list of loaded threads into the currently displayed list of
     * threads.
     *
     * @param newThreads
     * @param animate tell the listeners to update using animation
     */
    mergeLoadedThreads: function(newThreads, animate) {
        Forum.log.debug("Loaded thread list length " + newThreads.length);

        // This assumes that editing disables synchronization.
        // Reset any editing from previous page.
        this.threadBeingEdited = null;

        // Remove threads that are no longer present.
        for (let i = 0;i<this.currentThreads.length;i++) {
            const thread = this.currentThreads[i];
            let foundThread = false;
            for (let j = 0;j<newThreads.length;j++) {
                const t = newThreads[j];
                if (t.id==thread.id) {
                    foundThread = true;
                    break;
                }
            }
            if (!foundThread) {
                this.currentThreads.splice(i, 1);
                i--;
            }
        }

        // Remove threads that are already showing if they are in fact older.
        // If the new thread is older than what is already present, then remove the new thread in preparation for the merging step.
        for (let i = 0;i<newThreads.length;i++) {
            const thread = newThreads[i];
            for (let j = 0; j < this.currentThreads.length; j++) {
                const t = this.currentThreads[j];
                if (t.id==thread.id) {
                    if (t.time < thread.time) {
                        this.currentThreads.splice(j, 1);
                    } else {
                        Forum.log.debug("OUTDATED NEW THREAD");
                        newThreads.splice(i, 1);
                        i--;
                    }
                    break;
                }
            }
        }

        // Merge new threads into existing threads.
        for (let i = 0;i<newThreads.length;i++) {
            const thread = newThreads[i];
            let inserted = false;
            for (let j=this.currentThreads.length-1;j>=0;j--) {
                const t = this.currentThreads[j];
                if (t.pinned > thread.pinned || t.latestPost>=thread.latestPost) {
                    this.currentThreads.splice(j+1, 0, thread);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                this.currentThreads.splice(0, 0, thread);
            }
        }

        this.updateCurrentThreadWindow();
        this.notifyThreadListChangeListenersThreadListChanged(animate);
    },

    updateCurrentThreadWindow: function() {

        this.currentThreadWindowMinTime = Number.POSITIVE_INFINITY;
        this.currentThreadWindowMaxTime = Number.NEGATIVE_INFINITY;

        this.currentThreadWindowMinPinned = Number.POSITIVE_INFINITY;
        this.currentThreadWindowMaxPinned = Number.NEGATIVE_INFINITY;

        for (let i = 0;i<this.currentThreads.length;i++) {
            if ((
                    this.currentThreads[i].pinned==this.currentThreadWindowMaxPinned &&
                    this.currentThreads[i].latestPost>this.currentThreadWindowMaxTime
                ) || this.currentThreads[i].pinned>this.currentThreadWindowMaxPinned) {
                this.currentThreadWindowMaxPinned = this.currentThreads[i].pinned;
                this.currentThreadWindowMaxTime = this.currentThreads[i].latestPost;
                this.currentThreadWindowNewestId = this.currentThreads[i].id;
            }
            if ((
                    this.currentThreads[i].pinned==this.currentThreadWindowMinPinned &&
                    this.currentThreads[i].latestPost<this.currentThreadWindowMinTime
                ) || this.currentThreads[i].pinned<this.currentThreadWindowMinPinned) {
                this.currentThreadWindowMinPinned = this.currentThreads[i].pinned;
                this.currentThreadWindowMinTime = this.currentThreads[i].latestPost;
                this.currentThreadWindowOldestId = this.currentThreads[i].id;
            }
        }
    },

    mergeLoadedReplies: function(newReplies, animate) {
        Forum.log.debug("Loaded reply list length " + newReplies.length);

        // This assumes that editing disables synchronization.
        // Reset any editing from previous page.
        this.threadBeingEdited = null;
        this.replyBeingEdited = null;

        // Remove replies that are no longer present.
        for (let i = 0;i<this.currentReplies.length;i++) {
            const reply = this.currentReplies[i];
            let foundReply = false;
            for (let j = 0;j<newReplies.length;j++) {
                const r = newReplies[j];
                if (r.id==reply.id) {
                    foundReply = true;
                    break;
                }
            }
            if (!foundReply) {
                this.currentReplies.splice(i, 1);
                i--;
            }
        }

        // Remove replies that are already showing if they are in fact older.
        // If the new reply is older than what is already present, then remove the new reply in preparation for the merging step.
        for (let i = 0;i<newReplies.length;i++) {
            const reply = newReplies[i];
            for (let j = 0; j < this.currentReplies.length; j++) {
                const r = this.currentReplies[j];
                if (r.id==reply.id) {
                    if (r.time < reply.time) {
                        this.currentReplies.splice(j, 1);
                    } else {
                        Forum.log.debug("OUTDATED NEW REPLY");
                        newReplies.splice(i, 1);
                        i--;
                    }
                    break;
                }
            }
        }

        // Merge new replies into existing replies.
        for (let i = 0;i<newReplies.length;i++) {
            const reply = newReplies[i];
            let inserted = false;
            for (let j=this.currentReplies.length-1;j>=0;j--) {
                const r = this.currentReplies[j];
                if (r.id<reply.id) {
                    this.currentReplies.splice(j+1, 0, reply);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                this.currentReplies.splice(0, 0, reply);
            }
        }

        this.updateCurrentReplyWindow();
        this.notifyReplyListChangeListenersReplyListChanged(animate);
    },

    updateCurrentReplyWindow: function() {
        if (this.currentReplies.length > 0) {
            this.currentReplyWindowOldestId = Number.POSITIVE_INFINITY;
            this.currentReplyWindowNewestId = Number.NEGATIVE_INFINITY;

            for (let i = 0;i<this.currentReplies.length;i++) {
                if (this.currentReplies[i].created>this.currentReplyWindowNewestId) {
                    this.currentReplyWindowNewestId = this.currentReplies[i].id;
                }
                if (this.currentReplies[i].created<this.currentReplyWindowOldestId) {
                    this.currentReplyWindowOldestId = this.currentReplies[i].id;
                }
            }
        } else {
            this.currentReplyWindowOldestId = 0;
            this.currentReplyWindowNewestId = 0;
        }
    },

    getThreadById: function(threadId) {
        for (let i = 0;i<this.currentThreads.length;i++) {
            if (this.currentThreads[i].id==threadId) {
                return this.currentThreads[i];
            }
        }
        if (this.selectedThread.id==threadId) {
            return this.selectedThread;
        }
        return null;
    },

    getReplyById: function(replyId) {
        for (let i = 0;i<this.currentReplies.length;i++) {
            if (this.currentReplies[i].id==replyId) {
                return this.currentReplies[i];
            }
        }
        return null;
    },

    getThreadCount: function() {
        return this.threadCount;
    },

    getThreadOffset: function() {
        return this.threadOffset;
    },

    getSelectedThreadReplyCount: function() {
        return this.selectedThreadReplyCount;
    },

    getSelectedThreadReplyOffset: function() {
        return this.selectedThreadReplyOffset;
    },

    getSelectedThread: function() {
        return this.selectedThread;
    },

    selectThread: function(threadId) {
        if (!this.selectedThread) {
            this.selectedThread = this.getThreadById(threadId);
            this.trackingNewestThreads = false;
            this.threadBeingEdited = null;
            this.notifyThreadListChangeListenersThreadSelected(threadId);
        }
    },

    deselectThread: function() {
        if (this.selectedThread) {
            this.selectedThread = null;
            this.trackingNewestReplies = false;
            this.threadBeingEdited = null;
            this.replyBeingEdited = null;
            this.notifyThreadListChangeListenersThreadDeselected();
        }
    },

    getThreadBeingEdited: function() {
        return this.threadBeingEdited;
    },

    startThreadEdit: function(threadId) {
        this.threadBeingEdited = this.getThreadById(threadId);
        this.replyBeingEdited = null;
        this.notifyThreadListChangeListenersThreadEditStarted(threadId);
    },

    finishThreadEdit: function(thread) {
        this.threadBeingEdited = null;
        this.notifyThreadListChangeListenersThreadEditFinished();
        this.updateThread(thread);
    },

    cancelThreadEdit: function() {
        this.threadBeingEdited = null;
        this.notifyThreadListChangeListenersThreadEditCancelled();
    },

    getReplyBeingEdited: function() {
        return this.replyBeingEdited;
    },

    startReplyEdit: function(replyId) {
        this.replyBeingEdited = this.getReplyById(replyId);
        this.threadBeingEdited = null;
        this.notifyReplyListChangeListenersReplyEditStarted(replyId);
    },

    finishReplyEdit: function(reply) {
        this.replyBeingEdited = null;
        this.notifyReplyListChangeListenersReplyEditFinished();
        this.updateReply(reply);
    },

    cancelReplyEdit: function() {
        this.replyBeingEdited = null;
        this.notifyReplyListChangeListenersReplyEditCancelled();
    },

    /**
     * Update thread already in list of loaded threads. If for some reason, the thread is not present, simply ignore it.
     * If the updated thread for some reason is outdated, ignore it.
     * Does not update current thread window.
     *
     * @param thread
     */
    updateThread: function(thread) {
        if (this.currentThreads.length > 0) {
            for (let j = 0;j<this.currentThreads.length;j++) {
                const t = this.currentThreads[j];
                if (t.id==thread.id) {
                    if (t.time < thread.time) {
                        this.currentThreads.splice(j, 1, thread);
                        this.updateCurrentThreadWindow();
                        this.notifyThreadListChangeListenersThreadUpdated(thread);
                    } else {
                        Forum.log.debug("OUTDATED THREAD UPDATE");
                    }
                    break;
                }
            }
        } else if (this.selectedThread) {
            const t = this.selectedThread;
            if (t.id==thread.id) {
                if (t.time < thread.time) {
                    this.selectedThread = thread;
                    this.notifyThreadListChangeListenersThreadUpdated(thread);
                } else {
                    Forum.log.debug("OUTDATED THREAD UPDATE");
                }
            }
        }
    },

    /**
     * Update reply already in list of loaded replies. If for some reason, the reply is not present, simply ignore it.
     * If the updated reply for some reason is outdated, ignore it.
     * Does not update current reply window.
     *
     * @param reply
     */
    updateReply: function(reply) {
        for (let j = 0;j<this.currentReplies.length;j++) {
            const r = this.currentReplies[j];
            if (r.id==reply.id) {
                if (r.time < reply.time) {
                    this.currentReplies.splice(j, 1, reply);
                    this.notifyThreadListChangeListenersReplyUpdated(reply);
                } else {
                    Forum.log.debug("OUTDATED REPLY UPDATE: " + r.time + " " + reply.time);
                }
                break;
            }
        }
    },

    loadNewestReplies: function(threadId) {
        const self = this;
        Backend.getInstance().getForumReplies(
            function (res) {
                if (res.result.result) {
                    self.selectedThread = res.result.data.thread;
                    self.selectedThreadReplyCount = res.result.data.count;
                    self.selectedThreadReplyOffset = res.result.data.offset;
                    self.trackingNewestReplies = res.result.data.offset >= res.result.data.count - self.replyRequestSize;
                    const newReplies = res.result.data.replies;
                    self.mergeLoadedReplies(newReplies, false);
                } else {
                    // Handle messages.
                    TankTrouble.ErrorBox.show(res.result.message);
                    // Handle that the thread was deleted.
                    Forum.getInstance().leaveThread();
                }
            },
            function (res) {
                TankTrouble.ErrorBox.show(res.result.message);
            },
            function (res) {},
            threadId,
            9007199254740991, // Maximum safe integer
            "older",
            0,
            this.replyRequestSize
        );
    },

    loadOldestReplies: function(threadId) {
        const self = this;
        Backend.getInstance().getForumReplies(
            function (res) {
                if (res.result.result) {
                    self.selectedThread = res.result.data.thread;
                    self.selectedThreadReplyCount = res.result.data.count;
                    self.selectedThreadReplyOffset = res.result.data.offset;
                    self.trackingNewestReplies = res.result.data.offset >= res.result.data.count - self.replyRequestSize;
                    const newReplies = res.result.data.replies;
                    self.mergeLoadedReplies(newReplies, false);
                } else {
                    // Handle messages.
                    TankTrouble.ErrorBox.show(res.result.message);
                    // Handle that the thread was deleted.
                    Forum.getInstance().leaveThread();
                }
            },
            function (res) {},
            function (res) {},
            threadId,
            1,
            "newer",
            0,
            this.replyRequestSize
        )
    },

    loadNewerReplies: function(threadId, offset) {
        const self = this;
        Backend.getInstance().getForumReplies(
            function (res) {
                if (res.result.result) {
                    // Handle that we reached the end unexpectedly.
                    if (res.result.data.replies.length < self.replyRequestSize) {
                        self.loadNewestReplies(threadId);
                        return;
                    }
                    self.selectedThread = res.result.data.thread;
                    self.selectedThreadReplyCount = res.result.data.count;
                    self.selectedThreadReplyOffset = res.result.data.offset;
                    self.trackingNewestReplies = res.result.data.offset >= res.result.data.count - self.replyRequestSize;
                    const newReplies = res.result.data.replies;
                    self.mergeLoadedReplies(newReplies, false);
                } else {
                    // Handle messages.
                    TankTrouble.ErrorBox.show(res.result.message);
                    // Handle that the thread was deleted.
                    Forum.getInstance().leaveThread();
                }
            },
            function (res) {},
            function (res) {},
            threadId,
            self.currentReplyWindowNewestId + 1,
            "newer",
            offset,
            this.replyRequestSize
        );
    },

    loadOlderReplies: function(threadId, offset) {
        const self = this;
        Backend.getInstance().getForumReplies(
            function (res) {
                if (res.result.result) {
                    // Handle that we reached the end unexpectedly.
                    if (res.result.data.replies.length < self.replyRequestSize) {
                        self.loadOldestReplies(threadId);
                        return;
                    }
                    self.selectedThread = res.result.data.thread;
                    self.selectedThreadReplyCount = res.result.data.count;
                    self.selectedThreadReplyOffset = res.result.data.offset;
                    self.trackingNewestReplies = res.result.data.offset >= res.result.data.count - self.replyRequestSize;
                    const newReplies = res.result.data.replies;
                    self.mergeLoadedReplies(newReplies, false);
                } else {
                    // Handle messages.
                    TankTrouble.ErrorBox.show(res.result.message);
                    // Handle that the thread was deleted.
                    Forum.getInstance().leaveThread();
                }
            },
            function (res) {},
            function (res) {},
            threadId,
            self.currentReplyWindowOldestId - 1,
            "older",
            offset,
            this.replyRequestSize
        );
    },

    refreshReplies: function(threadId) {
        const self = this;
        Backend.getInstance().getForumReplies(
            function (res) {
                // Ignore refresh if we have stopped synchronizing.
                if (!Forum.getInstance().isSynchronizing()) {
                    return;
                }

                if (res.result.result) {
                    self.selectedThread = res.result.data.thread;
                    self.selectedThreadReplyCount = res.result.data.count;
                    self.selectedThreadReplyOffset = res.result.data.offset;
                    self.trackingNewestReplies = res.result.data.offset >= res.result.data.count - self.replyRequestSize;
                    const newReplies = res.result.data.replies;
                    self.mergeLoadedReplies(newReplies, true);
                } else {
                    // Handle messages.
                    TankTrouble.ErrorBox.show(res.result.message);
                    // Handle that the thread was deleted.
                    Forum.getInstance().leaveThread();
                }

            },
            function (res) {},
            function (res) {},
            threadId,
            9007199254740991, // Maximum safe integer
            "older",
            0,
            this.replyRequestSize
        );
    },

    loadRepliesById: function(threadId, replyId) {
        const self = this;
        Backend.getInstance().getForumReplies(
            function (res) {
                if (res.result.result) {
                    // Handle that we reached the end unexpectedly.
                    if (res.result.data.replies.length < self.replyRequestSize) {
                        self.loadNewestReplies(threadId);
                        return;
                    }
                    self.selectedThread = res.result.data.thread;
                    self.selectedThreadReplyCount = res.result.data.count;
                    self.selectedThreadReplyOffset = res.result.data.offset;
                    self.trackingNewestReplies = res.result.data.offset >= res.result.data.count - self.replyRequestSize;
                    const newReplies = res.result.data.replies;
                    self.mergeLoadedReplies(newReplies, false);
                } else {
                    // Handle messages.
                    TankTrouble.ErrorBox.show(res.result.message);
                    // Handle that the thread was deleted.
                    Forum.getInstance().leaveThread();
                }
            },
            function (res) {},
            function (res) {},
            threadId,
            replyId,
            "newer",
            0,
            this.replyRequestSize
        );
    },

    loadNewestThreads: function() {
        const self = this;
        Backend.getInstance().getForumThreads(
            function(res) {
                if (res.result.result) {
                    self.selectedThread = null;
                    self.threadCount = res.result.data.count;
                    self.threadOffset = res.result.data.offset;
                    self.trackingNewestThreads = res.result.data.offset == res.result.data.count;
                    const newThreads = res.result.data.threads;
                    self.mergeLoadedThreads(newThreads, false);
                } else {
                    // Handle messages.
                    TankTrouble.ErrorBox.show(res.result.message);
                }
            },
            function(res) {},
            function(res) {},
            2147483647, // Maximum timestamp in a 32bit environment. FIXME Update to 64bit value.
            //100000000*86400000,
            2147483647, // Maximum value in a 32bit environment. FIXME Update to 64bit value.
            "older",
            0,
            this.threadRequestSize
        );
    },

    loadNewerThreads: function(offset) {
        const self = this;
        Backend.getInstance().getForumThreads(
            function(res) {
                if (res.result.result) {
                    // Handle that we reached the end unexpectedly.
                    if (res.result.data.threads.length < self.threadRequestSize) {
                        self.loadNewestThreads();
                        return;
                    }
                    self.selectedThread = null;
                    self.threadCount = res.result.data.count;
                    self.threadOffset = res.result.data.offset;
                    self.trackingNewestThreads = res.result.data.offset == res.result.data.count;
                    const newThreads = res.result.data.threads;
                    self.mergeLoadedThreads(newThreads, false);
                } else {
                    // Handle messages.
                    TankTrouble.ErrorBox.show(res.result.message);
                }
            },
            function(res) {},
            function(res) {},
            this.currentThreadWindowMaxTime + 1,
            this.currentThreadWindowMaxPinned,
            "newer",
            offset,
            this.threadRequestSize
        );
    },

    loadOlderThreads: function(offset) {
        const self = this;
        Backend.getInstance().getForumThreads(
            function(res) {
                if (res.result.result) {
                    self.selectedThread = null;
                    self.threadCount = res.result.data.count;
                    self.threadOffset = res.result.data.offset;
                    self.trackingNewestThreads = res.result.data.offset == res.result.data.count;
                    const newThreads = res.result.data.threads;
                    self.mergeLoadedThreads(newThreads, false);
                } else {
                    // Handle messages.
                    TankTrouble.ErrorBox.show(res.result.message);
                }
            },
            function(res) {},
            function(res) {},
            this.currentThreadWindowMinTime - 1,
            this.currentThreadWindowMinPinned,
            "older",
            offset,
            this.threadRequestSize
        );
    },

    refreshThreads: function() {
        const self = this;
        Backend.getInstance().getForumThreads(
            function(res) {
                // Ignore refresh if we have stopped synchronizing.
                if (!Forum.getInstance().isSynchronizing()) {
                    return;
                }

                if (res.result.result) {
                    self.selectedThread = null;
                    self.threadCount = res.result.data.count;
                    self.threadOffset = res.result.data.offset;
                    self.trackingNewestThreads = res.result.data.offset == res.result.data.count;
                    const newThreads = res.result.data.threads;
                    self.mergeLoadedThreads(newThreads, true);
                } else {
                    // Handle messages.
                    TankTrouble.ErrorBox.show(res.result.message);
                }
            },
            function(res) {},
            function(res) {},
            2147483647, // Maximum timestamp in a 32bit environment. FIXME Update to 64bit value.
            //100000000*86400000,
            2147483647, // Maximum value in a 32bit environment. FIXME Update to 64bit value.
            "older",
            0,
            this.threadRequestSize
        );
    },

    loadThreadsById: function(threadId) {
        const self = this;
        Backend.getInstance().getForumThreadsById(
            function(res) {
                if (res.result.result) {
                    self.selectedThread = null;
                    self.threadCount = res.result.data.count;
                    self.threadOffset = res.result.data.offset;
                    self.trackingNewestThreads = res.result.data.offset == res.result.data.count;
                    const newThreads = res.result.data.threads;
                    self.mergeLoadedThreads(newThreads, false);
                } else {
                    // Handle messages.
                    TankTrouble.ErrorBox.show(res.result.message);
                }
            },
            function(res) {},
            function(res) {},
            threadId,
            this.threadRequestSize
        );
    }
});

var ForumView = Classy.newClass().name('ForumView');
ForumView.constructor(function(model) {

    // Store model reference
    this.model = model;

    this.threadPageFunctions = {
        newest: function() {Forum.getInstance().loadNewestThreads();},
        oldest: function() {Forum.getInstance().loadOldestThreads();},
        newer: function(offset) {Forum.getInstance().loadNewerThreads(offset);},
        older: function(offset) {Forum.getInstance().loadOlderThreads(offset);}
    };

    this.replyPageFunctions = {
        newest: function() {Forum.getInstance().loadNewestReplies();},
        oldest: function() {Forum.getInstance().loadOldestReplies();},
        newer: function(offset) {Forum.getInstance().loadNewerReplies(offset);},
        older: function(offset) {Forum.getInstance().loadOlderReplies(offset);}
    };
});

ForumView.classFields({
    STATE_THREADLIST: "threadlist",
    STATE_REPLYLIST: "replylist"
});

ForumView.fields({
    model: null,
    state: ForumView.STATE_THREADLIST,
    composeShowing: true,
    statusShowing: true,
    threadPageFunctions: null,
    replyPageFunctions: null,
    /**
     * When set to true, the view will replace the next history item rather
     * than pushing and set to false
     */
    replaceNextHistory: false,
    /**
     * When set to true, the view will not animate paginator updates
     */
    suppressNextUpdateAnimation: false
});

ForumView.methods({

    hideComposeStatusAndSynchronizationInfo: function() {
        this.composeShowing = false;
        this.statusShowing = false;
        this.synchronizationInfoShowing = false;

        $("#threadsWrapper .status").hide();
        $("#repliesWrapper .status").hide();
        $("#threadsWrapper .compose").hide();
        $("#repliesWrapper .compose").hide();
        $("#threadsWrapper .synchronization").hide();
        $("#repliesWrapper .synchronization").hide();
    },

    setReplaceNextHistory: function() {
        this.replaceNextHistory = true;
    },

    setSuppressNextUpdateAnimation: function() {
        this.suppressNextUpdateAnimation = true;
    },

    threadUpdated: function(thread) {
        const existingThread = $('#thread-' + thread.id);
        const t = existingThread.data();
        if (t && thread.id == t.id) {
            Forum.log.debug("VIEW THREAD UPDATE SINGLE");
            const threadHtml = $(thread.html.threadlist);
            const newHeader = threadHtml.find("div.header"); // div is necessary to avoid selecting input field.
            const newContent = $('<div class="content"></div>').append($.snarkdown(thread.message))
            const newDetails = threadHtml.find(".details");
            existingThread.find("div.header").replaceWith(newHeader); // div is necessary to avoid selecting input field.
            existingThread.find(".content").replaceWith(newContent);
            existingThread.find(".details").replaceWith(newDetails);
            existingThread.removeClass().addClass(threadHtml.attr('class'));
            existingThread.data(thread);

            this.updateSingleBubbleAndActionWidth(existingThread);

            if (this.state == ForumView.STATE_THREADLIST) {
                // Make the content ellipsized.
                newContent.dotdotdot({watch: 'window', height: 50});
            } else {
                // Make sure it is not selectable
                existingThread.removeClass("selectable");
            }

            this.updateModerationTooltip(existingThread);

            // This will also update compose and status.
            Forum.getInstance().checkCooldown(true);
        }
    },

    replyUpdated: function(reply) {
        const existingReply = $('#reply-' + reply.id);
        const r = existingReply.data();
        if (r && reply.id == r.id) {
            Forum.log.debug("VIEW REPLY UPDATE SINGLE");
            const replyHtml = $(reply.html.replylist);
            const newContent = $('<div class="content"></div>').append($.snarkdown(reply.message));
            const newDetails = replyHtml.find(".details");
            existingReply.find(".content").replaceWith(newContent);
            existingReply.find(".details").replaceWith(newDetails);
            existingReply.removeClass("banned deleted approved moderatable approvable deletable bannable editable likable liked").addClass(replyHtml.attr('class'));
            existingReply.data(reply);

            this.updateSingleBubbleAndActionWidth(existingReply);
            this.updateModerationTooltip(existingReply);

            // This will also update compose and status.
            Forum.getInstance().checkCooldown(true);
        }
    },

    removeEditingFromAll: function() {
        // Remove editing capabilities on all other threads and replies.
        const allThreads = $('.forum .thread');
        allThreads.removeClass("editing");
        Utils.removeAutomaticTextAreaResize(allThreads.find(".edit textarea"));
        const allReplies = $('.forum .reply');
        allReplies.removeClass("editing");
        Utils.removeAutomaticTextAreaResize(allReplies.find(".edit textarea"));
    },

    threadEditStarted: function(threadId) {
        const thread = this.model.getThreadBeingEdited();
    
        // Remove editing capabilities on all other threads and replies.
        this.removeEditingFromAll();
    
        Forum.getInstance().updateComposeAndStatus(true, false);
    
        // Add editing capability to thread.
        const editingThread = $("#thread-"+threadId);
        const editingInput = editingThread.find(".edit input");
        const editingTextArea = editingThread.find(".edit textarea");
        editingThread.addClass("editing");
        Utils.addAutomaticTextAreaResize(editingTextArea);
        editingTextArea.mdeditor();
    
        this.updateBubbleAndActionWidths();
    
        editingInput.val(thread.header);
    
        editingTextArea.val(thread.message);
        editingTextArea.trigger('input');
    
        editingTextArea.focus();
    },

    threadEditFinished: function() {
        // Remove editing.
        this.removeEditingFromAll();

        Forum.getInstance().updateComposeAndStatus(true, false);
    },

    threadEditCancelled: function() {
        this.threadEditFinished();

        this.updateBubbleAndActionWidths();
    },

    replyEditStarted: function(replyId) {
        const reply = this.model.getReplyBeingEdited();

        // Remove editing capabilities on all other threads and replies.
        this.removeEditingFromAll();

        Forum.getInstance().updateComposeAndStatus(true, false);

        // Add editing capability to reply.
        const editingReply = $("#reply-"+replyId);
        const editingTextArea = editingReply.find(".edit textarea");
        editingReply.addClass("editing");
        Utils.addAutomaticTextAreaResize(editingTextArea);
        editingTextArea.mdeditor();

        this.updateBubbleAndActionWidths();

        editingTextArea.val(reply.message);
        editingTextArea.trigger('input');

        editingTextArea.focus();
    },

    replyEditFinished: function() {
        // Remove editing.
        this.removeEditingFromAll();

        Forum.getInstance().updateComposeAndStatus(true, false);
    },

    replyEditCancelled: function() {
        this.replyEditFinished();

        this.updateBubbleAndActionWidths();
    },

    mergeReply: function(reply, i, animate) {
        // Loop over divs displaying replies
        let inserted = false;
        $('.forum .reply').each(function() {
            const r = $(this).data();
            if (reply.id == r.id) {
                Forum.log.debug("VIEW REPLY UPDATE");
                // reply is already stored here, so update it.
                const replyHtml = $(reply.html.replylist);
                const newContent = $('<div class="content"></div>').append($.snarkdown(reply.message));
                const newDetails = replyHtml.find(".details");
                $(this).find(".content").replaceWith(newContent);
                $(this).find(".details").replaceWith(newDetails);
                $(this).removeClass("banned deleted approved moderatable approvable deletable bannable editable likable liked").addClass(replyHtml.attr('class'));
                $(this).data(reply);

                inserted = true;
                return false;
            } else if (reply.id < r.id) {
                Forum.log.debug("VIEW REPLY MERGE");
                // reply is not stored here, so insert it.
                const atLeft = (Forum.getInstance().getSelectedThreadReplyOffset() + i) % 2 == 1;

                const replyHtml = $(reply.html.replylist);
                const newContent = $('<div class="content"></div>').append($.snarkdown(reply.message));
                replyHtml.find('.content').replaceWith(newContent);
                replyHtml.addClass(atLeft ? "left" : "right");
                if (animate) {
                    replyHtml.addClass("collapsed");
                }
                replyHtml.data(reply);
                replyHtml.insertBefore($(this));

                if (animate) {
                    insertedReplyHeight = replyHtml.height();
                    replyHtml.css({minHeight: 0, height: 0, opacity: 0});
                    replyHtml.delay(300).animate({height: insertedReplyHeight}, 300).animate({opacity: 1.0}, 300, function() { $(this).removeAttr('style');});
                    replyHtml.removeClass("collapsed");
                }

                inserted = true;
                return false;
            }
        });
        // We didn't find a place to put reply, so simply put it in
        // the repliesContainer at the bottom.
        if (!inserted) {
            Forum.log.debug("VIEW REPLY BOTTOM");
            // reply is not stored here, so insert it.
            const previousReply = $('.forum .reply').last();
            let atLeft = false;
            // If there is a previous reply, place the new reply opposite of it.
            if (previousReply.length > 0) {
                Forum.log.debug("RELATIVE PLACEMENT");
                atLeft = previousReply.hasClass("left") ? false : true;
            } else {
                Forum.log.debug("ABSOLUTE PLACEMENT");
                atLeft = (Forum.getInstance().getSelectedThreadReplyOffset() + i) % 2 == 1;
            }
            const replyHtml = $(reply.html.replylist);
            const newContent = $('<div class="content"></div>').append($.snarkdown(reply.message));
            replyHtml.find('.content').replaceWith(newContent);
            replyHtml.addClass(atLeft ? "left" : "right");
            if (animate) {
                replyHtml.addClass("collapsed");
            }
            replyHtml.data(reply);
            replyHtml.appendTo('#repliesContainer');

            if (animate) {
                insertedReplyHeight = replyHtml.height();
                replyHtml.css({minHeight: 0, height: 0, opacity: 0});
                replyHtml.delay(300).animate({height: insertedReplyHeight}, 300).animate({opacity: 1.0}, 300, function() { $(this).removeAttr('style');});
                replyHtml.removeClass("collapsed");
            }
        }

    },

    mergeThread: function(thread, animate) {
        // Loop over divs displaying thread headers
        // ordered by pinned, descending and latestPost, descending
        let inserted = false;

        const self = this;
        $('.forum .thread').each(function() {
            const t = $(this).data();
            if (thread.pinned > t.pinned || (thread.pinned >= t.pinned && thread.latestPost >= t.latestPost)) {
                // We are at the spot where thread should be placed
                if (thread.id == t.id) {
                    // thread is already stored here, so update it.
                    const threadHtml = $(thread.html.threadlist);
                    const newContent = $('<div class="content"></div>').append($.snarkdown(thread.message));
                    const newDetails = threadHtml.find(".details");
                    $(this).find(".content").replaceWith(newContent);
                    $(this).find(".details").replaceWith(newDetails);
                    $(this).removeClass().addClass(threadHtml.attr('class'));
                    $(this).data(thread);

                    self.updateSingleBubbleAndActionWidth($(this));

                    // Make the content ellipsized.
                    newContent.dotdotdot({watch: 'window', height: 50});

                    self.updateModerationTooltip($(this));
                } else {
                    // thread is not stored here, so insert it.
                    const threadHtml = $(thread.html.threadlist);
                    const newContent = $('<div class="content"></div>').append($.snarkdown(thread.message));
                    threadHtml.find('.content').replaceWith(newContent);
                    threadHtml.insertBefore($(this));
                    threadHtml.data(thread).find('.bubble').click(function() { Forum.getInstance().selectThread(thread.id) });

                    self.updateSingleBubbleAndActionWidth(threadHtml);

                    // Make the content ellipsized.
                    const content = threadHtml.find(".content");
                    content.dotdotdot({watch: 'window', height: 50});

                    self.updateModerationTooltip(threadHtml);

                    if (animate) {
                        insertedThreadHeight = threadHtml.height();
                        threadHtml.css({minHeight: 0, marginTop: 0, height: 0, opacity: 0});
                        threadHtml.delay(300).animate({height: insertedThreadHeight, marginTop: 10}, 300).animate({opacity: 1.0}, 300, function() { $(this).removeAttr('style');});
                    }
                }
                inserted = true;
                return false;
            }
        });
        // We didn't find a place to put thread, so simply put it in
        // the threadsContainer at the bottom.
        if (!inserted) {
            const threadHtml = $(thread.html.threadlist);
            const newContent = $('<div class="content"></div>').append($.snarkdown(thread.message));
            threadHtml.find('.content').replaceWith(newContent);
            threadHtml.appendTo('#threadsContainer');
            threadHtml.data(thread).find('.bubble').click(function() { Forum.getInstance().selectThread(thread.id) });

            this.updateSingleBubbleAndActionWidth(threadHtml);

            // Make the content ellipsized.
            const content = threadHtml.find(".content");
            content.dotdotdot({watch: 'window', height: 50});

            this.updateModerationTooltip(threadHtml);

            if (animate) {
                insertedThreadHeight = threadHtml.height();
                threadHtml.css({minHeight: 0, marginTop: 0, height: 0, opacity: 0});
                threadHtml.delay(300).animate({height: insertedThreadHeight, marginTop: 10}, 300).animate({opacity: 1.0}, 300, function() { $(this).removeAttr('style');});
            }
        }

    },

    // pageFunctions: object containing functions for loading newer, older, newest and oldest.
    updatePaginator: function(paginator, currentPage, pageCount, pageFunctions, showOldestPage, showPageNumbers, hideBackButton, animate) {
        let currentPages = paginator.find('.page');
        const currentOtherPages = paginator.find('.other .page');

        const ellipses = paginator.find('.ellipsis');

        // If there only one page, remove all pages and ellipses.
        if (pageCount <= 1) {
            currentPages.each(function() {
                if (animate) {
                    $(this).find('img:visible').animate({width: 0, height: 0, bottom: UIConstants.FORUM_PAGE_BUTTON_ANIMATION_BOTTOM}, UIConstants.ELEMENT_MOVE_TIME, function() { $(this).remove();});
                    $(this).animate({opacity: 0}, UIConstants.ELEMENT_MOVE_TIME, function() { $(this).remove();});
                } else {
                    $(this).remove();
                }
            });

            ellipses.each(function() {
                if (animate) {
                    $(this).find('img').animate({width: 0, height: 0}, UIConstants.ELEMENT_MOVE_TIME);
                    $(this).animate({opacity: 0}, UIConstants.ELEMENT_MOVE_TIME);
                } else {
                    $(this).hide();
                }
            });

            if (hideBackButton) {
                const back = paginator.find('.back');
                if (animate) {
                    back.find('img:visible').animate({width: 0, height: 0}, UIConstants.ELEMENT_MOVE_TIME);
                    back.animate({opacity: 0}, UIConstants.ELEMENT_MOVE_TIME);
                } else {
                    back.hide();
                }
            }

            return;
        }

        // Show back button.
        if (hideBackButton) {
            const back = paginator.find('.back');
            if (animate) {
                back.find('img:visible').animate({width: UIConstants.FORUM_BACK_BUTTON_WIDTH, height: UIConstants.FORUM_PAGE_BUTTON_HEIGHT, bottom: 0}, UIConstants.ELEMENT_MOVE_TIME);
                back.show().animate({opacity: 1}, UIConstants.ELEMENT_MOVE_TIME);
            } else {
                // Reset animated values.
                back.find('img').css({width: UIConstants.FORUM_BACK_BUTTON_WIDTH, height: UIConstants.FORUM_PAGE_BUTTON_HEIGHT, bottom: 0});
                back.show().css({opacity: 1});
            }

        }

        // Otherwise, we need to update currently shown pages.

        // First, remove pages that are too far away from current page or are not needed.
        currentOtherPages.each(function() {
            // Do not remove newest and oldest pages.
            if ($(this).hasClass("newest") || $(this).hasClass("oldest")) {
                return;
            }

            const p = $(this).data();
            if (p.number < pageCount - 1 && Math.abs(p.number - currentPage) <= UIConstants.FORUM_MAX_PAGES_AROUND_CURRENT) {
                return;
            }

            if (animate) {
                $(this).find('img:visible').animate({width: 0, height: 0, bottom: UIConstants.FORUM_PAGE_BUTTON_ANIMATION_BOTTOM}, UIConstants.ELEMENT_MOVE_TIME, function() { $(this).remove();});
                $(this).animate({opacity: 0}, UIConstants.ELEMENT_MOVE_TIME, function() { $(this).remove();});
            } else {
                $(this).remove();
            }
        });

        // Then, add pages that are needed but not already present.
        for (let i = UIConstants.FORUM_MAX_PAGES_AROUND_CURRENT; i>=-UIConstants.FORUM_MAX_PAGES_AROUND_CURRENT; i--) {
            let pageFound = false;
            currentOtherPages.each(function() {
                const p = $(this).data();
                if (p.number == currentPage+i) {
                    pageFound = true;
                    return false;
                }
            });
            if (!pageFound) {
                const pageNumber = currentPage+i;
                if (pageNumber > 0 && pageNumber < pageCount - 1) {
                    const newPage = $("<div class='button page' title='Show page "+(pageNumber+1)+"'></div>");
                    const randomImage = Math.floor(Math.random() * UIConstants.FORUM_PAGE_BUTTON_WIDTHS.length);
                    Utils.addImageWithClasses(newPage, "standard", "assets/images/forum/page" + randomImage + ".png");
                    Utils.addImageWithClasses(newPage, "active", "assets/images/forum/page" + randomImage + "Active.png");
                    Utils.addImageWithClasses(newPage, "selected", "assets/images/forum/page" + randomImage + "Selected.png");
                    Utils.addImageWithClasses(newPage, "selected active", "assets/images/forum/page" + randomImage + "SelectedActive.png");

                    newPage.tooltipster({position: "top"});

                    newPage.data({number: pageNumber});

                    let inserted = false;
                    paginator.find('.other .page').each(function() {
                        const p = $(this).data();
                        if (p.number > pageNumber) {
                            newPage.insertBefore($(this));
                            inserted = true;
                            return false;
                        }
                    });
                    if (!inserted) {
                        paginator.find('.other').append(newPage);
                    }

                    // Handle animation
                    if (animate) {
                        newPage.find('img:visible').css({width: 0, height: 0, bottom: UIConstants.FORUM_PAGE_BUTTON_ANIMATION_BOTTOM})
                            .animate({width: UIConstants.FORUM_PAGE_BUTTON_WIDTHS[randomImage], height: UIConstants.FORUM_PAGE_BUTTON_HEIGHT, bottom: 0}, UIConstants.ELEMENT_MOVE_TIME);
                        newPage.css({opacity: 0}).animate({opacity: 1}, UIConstants.ELEMENT_MOVE_TIME);
                    }

                }
            }
        }

        const oldestPage = paginator.find('.oldest .page');
        if (showOldestPage) {
            if (oldestPage.length == 0) {
                const newPage = $("<div class='button page oldest' title='Show "+(showPageNumbers?"page 1":"first")+"'></div>");
                Utils.addImageWithClasses(newPage, "standard", "assets/images/forum/pageOldest.png");
                Utils.addImageWithClasses(newPage, "active", "assets/images/forum/pageOldestActive.png");
                Utils.addImageWithClasses(newPage, "selected", "assets/images/forum/pageOldestSelected.png");
                Utils.addImageWithClasses(newPage, "selected active", "assets/images/forum/pageOldestSelectedActive.png");

                newPage.tooltipster({position: "top"});

                newPage.data({number: 0});

                newPage.on("mouseup", function() {
                    pageFunctions["oldest"]();
                });

                paginator.find('.oldest').append(newPage);

                // Handle animation
                if (animate) {
                    newPage.find('img:visible').css({width: 0, height: 0, bottom: UIConstants.FORUM_PAGE_BUTTON_ANIMATION_BOTTOM})
                        .animate({width: UIConstants.FORUM_OLDEST_PAGE_BUTTON_WIDTH, height: UIConstants.FORUM_PAGE_BUTTON_HEIGHT, bottom: 0}, UIConstants.ELEMENT_MOVE_TIME);
                    newPage.css({opacity: 0}).animate({opacity: 1}, UIConstants.ELEMENT_MOVE_TIME);
                }
            }
        } else {
            if (animate) {
                oldestPage.find('img:visible').animate({width: 0, height: 0, bottom: UIConstants.FORUM_PAGE_BUTTON_ANIMATION_BOTTOM}, UIConstants.ELEMENT_MOVE_TIME, function() { $(this).remove();});
                oldestPage.animate({opacity: 0}, UIConstants.ELEMENT_MOVE_TIME, function() { $(this).remove();});
            } else {
                oldestPage.remove();
            }
        }
        const newestPage = paginator.find('.newest .page');
        if (newestPage.length == 0) {
            const newPage = $("<div class='button page newest' title='Show newest'></div>");
            Utils.addImageWithClasses(newPage, "standard", "assets/images/forum/pageNewest.png");
            Utils.addImageWithClasses(newPage, "active", "assets/images/forum/pageNewestActive.png");
            Utils.addImageWithClasses(newPage, "selected", "assets/images/forum/pageNewestSelected.png");
            Utils.addImageWithClasses(newPage, "selected active", "assets/images/forum/pageNewestSelectedActive.png");

            newPage.tooltipster({position: "top"});

            // This must be updated every time.
            newPage.data({number: pageCount - 1});

            newPage.on("mouseup", function() {
                pageFunctions["newest"]();
            });

            paginator.find('.newest').append(newPage);

            // Handle animation
            if (animate) {
                newPage.find('img:visible').css({width: 0, height: 0, bottom: UIConstants.FORUM_PAGE_BUTTON_ANIMATION_BOTTOM})
                    .animate({width: UIConstants.FORUM_NEWEST_PAGE_BUTTON_WIDTH, height: UIConstants.FORUM_PAGE_BUTTON_HEIGHT, bottom: 0}, UIConstants.ELEMENT_MOVE_TIME);
                newPage.css({opacity: 0}).animate({opacity: 1}, UIConstants.ELEMENT_MOVE_TIME);
            }
        }

        // Determine if ellipses should show or not.
        if (currentPage - UIConstants.FORUM_MAX_PAGES_AROUND_CURRENT > 1) {
            if (animate) {
                ellipses.first().find('img').animate({width: UIConstants.FORUM_PAGE_ELLIPSIS_WIDTH, height: UIConstants.FORUM_PAGE_BUTTON_HEIGHT, bottom: 0}, UIConstants.ELEMENT_MOVE_TIME);
                ellipses.first().show().animate({opacity: 1}, UIConstants.ELEMENT_MOVE_TIME);
            } else {
                // Reset animated values.
                ellipses.first().find('img').css({width: UIConstants.FORUM_PAGE_ELLIPSIS_WIDTH, height: UIConstants.FORUM_PAGE_BUTTON_HEIGHT, bottom: 0});
                ellipses.first().show().css({opacity: 1});
            }
        } else {
            if (animate) {
                ellipses.first().find('img').animate({width: 0, height: 0, bottom: UIConstants.FORUM_PAGE_ELLIPSIS_ANIMATION_BOTTOM}, UIConstants.ELEMENT_MOVE_TIME);
                ellipses.first().animate({opacity: 0}, UIConstants.ELEMENT_MOVE_TIME);
            } else {
                ellipses.first().hide();
            }
        }

        if (currentPage + UIConstants.FORUM_MAX_PAGES_AROUND_CURRENT < pageCount - 2) {
            if (animate) {
                ellipses.last().find('img').animate({width: UIConstants.FORUM_PAGE_ELLIPSIS_WIDTH, height: UIConstants.FORUM_PAGE_BUTTON_HEIGHT, bottom: 0}, UIConstants.ELEMENT_MOVE_TIME);
                ellipses.last().show().animate({opacity: 1}, UIConstants.ELEMENT_MOVE_TIME);
            } else {
                // Reset animated values.
                ellipses.last().find('img').css({width: UIConstants.FORUM_PAGE_ELLIPSIS_WIDTH, height: UIConstants.FORUM_PAGE_BUTTON_HEIGHT, bottom: 0});
                ellipses.last().show().css({opacity: 1});
            }
        } else {
            if (animate) {
                ellipses.last().find('img').animate({width: 0, height: 0, bottom: UIConstants.FORUM_PAGE_ELLIPSIS_ANIMATION_BOTTOM}, UIConstants.ELEMENT_MOVE_TIME);
                ellipses.last().animate({opacity: 0}, UIConstants.ELEMENT_MOVE_TIME);
            } else {
                ellipses.last().hide();
            }
        }

        // Update collection to reflect changes.
        currentPages = paginator.find('.page');

        // Finally, update existing pages (onmouseup function, highlights, etc.).
        currentPages.each(function() {
            const p = $(this).data();

            // Update number of newest page.
            if ($(this).hasClass("newest")) {
                $(this).data({number: pageCount - 1});
            }

            // Update highlight.
            if (p.number == currentPage) {
                $(this).addClass("selected");
            } else {
                $(this).removeClass("selected");
            }

            // Do not update newest and oldest pages' onmouseup function.
            if ($(this).hasClass("newest") || $(this).hasClass("oldest")) {
                return;
            }

            // Update onmouseup function and tooltip.
            $(this).off("mouseup");
            if (p.number != currentPage) {
                const offset = Math.abs(p.number - currentPage) - 1;
                $(this).tooltipster('enable');
                if (p.number < currentPage) {
                    if (!showPageNumbers) {
                        $(this).tooltipster('content', "Show older");
                    }
                    $(this).on("mouseup", function() {
                        pageFunctions["older"](offset);
                    });
                } else {
                    if (!showPageNumbers) {
                        $(this).tooltipster('content', "Show newer");
                    }
                    $(this).on("mouseup", function() {
                        pageFunctions["newer"](offset);
                    });
                }
            } else {
                $(this).tooltipster('disable');
            }
        });
    },

    replyListChanged: function(replyList, animate) {
        this.changeState(ForumView.STATE_REPLYLIST);

        if (this.model.getTrackingNewestReplies()) {
            Forum.getInstance().startReplySynchronization(UIConstants.FORUM_REPLY_REFRESH_INTERVAL, !this.suppressNextUpdateAnimation);
        } else {
            Forum.getInstance().stopSynchronization(!this.suppressNextUpdateAnimation);
        }

        const thread = this.model.getSelectedThread();
        // Display main thread object
        const threadData = $('#repliesThreadData');
        const threadHtml = $(thread.html.threadlist);
        const existingThread = $('#thread-'+thread.id);
        const parsedContent = $('<div class="content"></div>').append($.snarkdown(thread.message));
        const t = existingThread.data();
        if (t && t.id == thread.id) {
            // thread is already showing, so update it.
            const newDetails = threadHtml.find(".details");
            existingThread.find(".content").replaceWith(parsedContent);
            existingThread.find(".details").replaceWith(newDetails);
            existingThread.removeClass().addClass(threadHtml.attr('class'));
            existingThread.data(thread);
        } else {
            // thread is not showing, so insert it.
            threadHtml.data(thread);
            threadHtml.find(".content").replaceWith(parsedContent);
            threadData.append(threadHtml);
        }

        // Make sure it is not selectable
        $('#thread-'+thread.id).removeClass("selectable");

        for (let i = 0;i<replyList.length;i++) {
            this.mergeReply(replyList[i], i, animate);
        }
        // Remove displayed replies not in replyList.
        $('.forum .reply[id]').each(function() {
            const r = $(this).data();
            for (i=0;i<replyList.length;i++) {
                if (replyList[i].id==r.id) {
                    // Found matching element
                    return;
                }
            }
            // We made it through the list without finding the dom element
            // in replylist, so remove it
            if (animate) {
                $(this).addClass("collapsed");
                $(this).css("height", $(this).height()).css("min-height", 0).animate({opacity: 0.0}, 300).animate({height: 0}, 300, function() { $(this).remove();});
            } else {
                $(this).remove();
            }
        });

        // Construct paginator stuff
        // Calculate number of pages at current page size
        const pageCount = Math.ceil(
            this.model.getSelectedThreadReplyCount()/this.model.getReplyRequestSize()
        );

        const currentPage = Math.floor(
            pageCount - (this.model.getSelectedThreadReplyCount() - this.model.getSelectedThreadReplyOffset())/this.model.getReplyRequestSize()
        );

        Forum.log.debug(this.model.getSelectedThreadReplyOffset() + "/" +  this.model.getSelectedThreadReplyCount());
        Forum.log.debug(currentPage + "/" + pageCount);

        // Loop over pages to determine whether a link should be put in
        // the pagination section
        this.updatePaginator($('.repliesPaginator').first(), currentPage, pageCount, this.replyPageFunctions, true, true, false, !this.suppressNextUpdateAnimation);
        this.updatePaginator($('.repliesPaginator').last(), currentPage, pageCount, this.replyPageFunctions, true, true, true, !this.suppressNextUpdateAnimation);

        // Update compose fields.
        Forum.getInstance().updateComposeAndStatus(!this.suppressNextUpdateAnimation, true);

        this.suppressNextUpdateAnimation = false;

        Forum.log.debug('Pushing reply list length '+ replyList.length);

        const data = {
            threadId: this.model.getSelectedThread().id,
            id: this.model.getCurrentReplyWindowOldestId()
        };

        // Update bubble and action widths.
        this.updateBubbleAndActionWidths();
        // Update all moderation tooltips.
        this.updateModerationTooltips();

        Content.updateTab('forum', '/forum?threadId='+data.threadId+'&id='+data.id, data, this.replaceNextHistory);
        this.replaceNextHistory = false;
    },

    threadListChanged: function(threadList, animate) {
        this.changeState(ForumView.STATE_THREADLIST)

        if (this.model.getTrackingNewestThreads()) {
            Forum.getInstance().startThreadSynchronization(UIConstants.FORUM_THREAD_REFRESH_INTERVAL, !this.suppressNextUpdateAnimation);
        } else {
            Forum.getInstance().stopSynchronization(!this.suppressNextUpdateAnimation);
        }

        for (let i = 0;i<threadList.length;i++) {
            this.mergeThread(threadList[i], animate);
        }
        // Remove displayed threads not in threadList or outdated.
        $('.forum .thread[id]').each(function() {
            const t = $(this).data();
            for (i=0;i<threadList.length;i++) {
                if (threadList[i].id==t.id) {
                    // Found matching element so now check that it is up to date.
                    if (threadList[i].time<=t.time) {
                        return;
                    }
                }
            }
            // We made it through the list without finding the dom element
            // in threadlist, so remove it
            if (animate) {
                $(this).css("height", $(this).height()).css("min-height", 0).animate({opacity: 0.0}, 300).animate({height: 0, marginTop: 0}, 300, function() { $(this).remove();});
            } else {
                $(this).remove();
            }
        });

        // Construct paginator stuff
        // Calculate number of pages at current page size
        const pageCount = Math.ceil(
            this.model.getThreadCount()/this.model.getThreadRequestSize()
        );

        const currentPage = Math.floor(
            pageCount - (this.model.getThreadCount() - this.model.getThreadOffset())/this.model.getThreadRequestSize() - 1
        );

        Forum.log.debug(this.model.getThreadOffset() + "/" +  this.model.getThreadCount());
        Forum.log.debug(currentPage + "/" + pageCount);

        // Loop over pages to determine whether a link should be put in
        // the pagination section
        this.updatePaginator($('.threadsPaginator').first(), currentPage, pageCount, this.threadPageFunctions, false, false, false, !this.suppressNextUpdateAnimation);
        this.updatePaginator($('.threadsPaginator').last(), currentPage, pageCount, this.threadPageFunctions, false, false, false, !this.suppressNextUpdateAnimation);

        // Update compose fields.
        Forum.getInstance().updateComposeAndStatus(!this.suppressNextUpdateAnimation, true);

        this.suppressNextUpdateAnimation = false;

        Forum.log.debug('Pushing thread list length '+ threadList.length);

        const data = {
            id: this.model.getCurrentThreadWindowNewestThreadId()
        }
        Content.updateTab('forum', '/forum?id='+data.id, data, this.replaceNextHistory);
        this.replaceNextHistory = false;
    },


    threadSelected: function(threadId) {
        this.setSuppressNextUpdateAnimation();
        $('#threadsWrapper .compose input').val("");
        $('#threadsWrapper .compose textarea').val("");
        $('#threadsWrapper .compose textarea').trigger('input');
        this.model.loadNewestReplies(threadId);
    },

    threadDeselected: function() {
        this.setSuppressNextUpdateAnimation();
        $('#repliesWrapper .compose textarea').val("");
        $('#repliesWrapper .compose textarea').trigger('input');
        const threadId = this.model.getCurrentThreadWindowNewestThreadId();
        if (threadId == 0) {
            this.model.loadNewestThreads();
        } else {
            this.model.loadThreadsById(threadId);
        }
    },

    changeState: function(state) {
        Forum.log.debug("STATE: " + state);
        this.state = state;

        // Undo initial hidden state of wrappers.
        $("#threadsWrapper").removeClass("hidden");
        $("#repliesWrapper").removeClass("hidden");

        if (this.state==ForumView.STATE_REPLYLIST) {
            $('#threadsWrapper').hide();
            $('#threadsContainer').empty();
            $('.threadsPaginator').find('.oldest, .other, .newest').empty();
            $('.threadsPaginator').find('.ellipsis').hide();
            $('#repliesWrapper').show();
        } else {
            $('#repliesWrapper').hide();
            $('#repliesThreadData').empty();
            $('#repliesContainer').empty();
            $('.repliesPaginator').find('.oldest, .other, .newest').empty();
            $('.repliesPaginator').find('.ellipsis').hide();
            $('#threadsWrapper').show();
        }
    },

    getState: function() {
        return this.state;
    },

    updateSynchronizationInfo: function(animate) {
        const showInfo = Forum.getInstance().isSynchronizing();

        if (showInfo) {
            // Update message.
            const synchText = Forum.getInstance().getSynchronizationText();
            $("#threadsWrapper .synchronization").text("Updating " + synchText);
            $("#repliesWrapper .synchronization").text("Updating " + synchText);


            if (!this.synchronizationInfoShowing) {
                if (animate) {
                    let targetHeight = $("#threadsWrapper .synchronization").stop(true).removeAttr('style').height();
                    $("#threadsWrapper .synchronization").css({height: 0, opacity: 0, marginTop: 0});
                    $("#threadsWrapper .synchronization").animate({height: targetHeight, marginTop: 10}, 300).animate({opacity: 1.0}, 300, function() { $(this).removeAttr('style');});
                    targetHeight = $("#repliesWrapper .synchronization").stop(true).removeAttr('style').height();
                    $("#repliesWrapper .synchronization").css({height: 0, opacity: 0, marginTop: 0});
                    $("#repliesWrapper .synchronization").animate({height: targetHeight, marginTop: 10}, 300).animate({opacity: 1.0}, 300, function() { $(this).removeAttr('style');});
                } else {
                    // Reset animated values.
                    $("#threadsWrapper .synchronization").stop(true).removeAttr('style');
                    $("#repliesWrapper .synchronization").stop(true).removeAttr('style');
                }
            }
            this.synchronizationInfoShowing = true;
        } else {
            if (this.synchronizationInfoShowing) {
                if (animate) {
                    $("#threadsWrapper .synchronization").stop(true).css("height", $("#threadsWrapper .synchronization").height()).animate({opacity: 0.0}, 300).animate({height: 0, marginTop: 0}, 300);
                    $("#repliesWrapper .synchronization").stop(true).css("height", $("#repliesWrapper .synchronization").height()).animate({opacity: 0.0}, 300).animate({height: 0, marginTop: 0}, 300);
                } else {
                    $("#threadsWrapper .synchronization").stop(true).hide();
                    $("#repliesWrapper .synchronization").stop(true).hide();

                }

            }
            this.synchronizationInfoShowing = false;
        }
    },

    updateComposeAndStatus: function(eligibleUsernameMap, animate) {
        const playerIds = Users.getAuthenticatedPlayerIds();

        // Find first eligible player present. If none, store number of unverified or temp banned players present.
        let eligibleUsername = "";
        let unverifiedCount = 0;
        let tempBannedCount = 0;
        for (let i = 0; i < playerIds.length; ++i) {
            if (eligibleUsernameMap[playerIds[i]].eligible && eligibleUsername == "") {
                eligibleUsername = eligibleUsernameMap[playerIds[i]].username;
            }
            if (eligibleUsernameMap[playerIds[i]].unverified) {
                ++unverifiedCount;
            }
            if (eligibleUsernameMap[playerIds[i]].tempBanned) {
                ++tempBannedCount;
            }
        }

        const showCompose = playerIds.length > 0 && eligibleUsername != "" && !Forum.getInstance().isEditing() && Forum.getInstance().isSynchronizing() && Forum.getInstance().isCooledDown();

        if (showCompose) {
            // Update details.
            if (eligibleUsername == "") {
                $(".compose .details").text("");
            } else {
                $(".compose .details").text("Posting as " + eligibleUsername);
            }
            if (!this.composeShowing) {
                if (animate) {
                    let targetHeight = $("#threadsWrapper .compose").stop(true).removeAttr('style').height();
                    $("#threadsWrapper .compose").css({height: 0, opacity: 0, marginTop: 0});
                    $("#threadsWrapper .compose").delay(300).animate({height: targetHeight, marginTop: 10}, 300).animate({opacity: 1.0}, 300, function() { $(this).removeAttr('style');});
                    targetHeight = $("#repliesWrapper .compose").stop(true).removeAttr('style').height();
                    $("#repliesWrapper .compose").css({height: 0, opacity: 0, marginTop: 0});
                    $("#repliesWrapper .compose").delay(300).animate({height: targetHeight, marginTop: 10}, 300).animate({opacity: 1.0}, 300, function() { $(this).removeAttr('style');});
                } else {
                    // Reset animated values.
                    $("#threadsWrapper .compose").stop(true).removeAttr('style');
                    $("#repliesWrapper .compose").stop(true).removeAttr('style');
                }
            }
            this.composeShowing = true;

            if (this.statusShowing) {
                // Hide message.
                if (animate) {
                    $("#threadsWrapper .status").stop(true).css("height", $("#threadsWrapper .status").height()).animate({opacity: 0.0}, 300).animate({height: 0, marginTop: 0}, 300);
                    $("#repliesWrapper .status").stop(true).css("height", $("#repliesWrapper .status").height()).animate({opacity: 0.0}, 300).animate({height: 0, marginTop: 0}, 300);
                } else {
                    $("#threadsWrapper .status").stop(true).hide();
                    $("#repliesWrapper .status").stop(true).hide();

                }
            }
            this.statusShowing = false;
        } else {
            // Update message.
            if (playerIds.length == 0) {
                $("#threadsWrapper .status").text("Log in to start a thread");
                $("#repliesWrapper .status").text("Log in to reply");
            } else if (tempBannedCount == playerIds.length) {
                $("#threadsWrapper .status").text("You have been temporarily banned from posting");
                $("#repliesWrapper .status").text("You have been temporarily banned from posting");
            } else if (unverifiedCount + tempBannedCount == playerIds.length) {
                $("#threadsWrapper .status").text("Verify your email to start a thread");
                $("#repliesWrapper .status").text("Verify your email to reply");
            } else if (Forum.getInstance().isEditing()) {
                $("#threadsWrapper .status").text("Finish editing before starting a new thread");
                $("#repliesWrapper .status").text("Finish editing before replying again");
            } else if (!Forum.getInstance().isSynchronizing()) {
                $("#threadsWrapper .status").text("Go to the newest threads to start a thread");
                $("#repliesWrapper .status").text("Go to the newest page to reply");
            } else if (!Forum.getInstance().isCooledDown()) {
                const cooldownText = Forum.getInstance().getCooldownText();
                $("#threadsWrapper .status").text("Wait " + cooldownText + " to start a new thread");
                $("#repliesWrapper .status").text("Wait " + cooldownText + " to reply again");
            }

            if (this.composeShowing) {
                if (animate) {
                    $("#threadsWrapper .compose").css("height", $("#threadsWrapper .compose").height()).animate({opacity: 0.0}, 300).animate({height: 0, marginTop: 0}, 300);
                    $("#repliesWrapper .compose").css("height", $("#repliesWrapper .compose").height()).animate({opacity: 0.0}, 300).animate({height: 0, marginTop: 0}, 300);
                } else {
                    $("#threadsWrapper .compose").hide();
                    $("#repliesWrapper .compose").hide();
                }
            }
            this.composeShowing = false;

            if (!this.statusShowing) {
                // Show message.
                if (animate) {
                    let targetHeight = $("#threadsWrapper .status").removeAttr('style').height();
                    $("#threadsWrapper .status").css({height: 0, opacity: 0, marginTop: 0});
                    $("#threadsWrapper .status").delay(300).animate({height: targetHeight, marginTop: 10}, 300).animate({opacity: 1.0}, 300, function() { $(this).removeAttr('style');});
                    targetHeight = $("#repliesWrapper .status").removeAttr('style').height();
                    $("#repliesWrapper .status").css({height: 0, opacity: 0, marginTop: 0});
                    $("#repliesWrapper .status").delay(300).animate({height: targetHeight, marginTop: 10}, 300).animate({opacity: 1.0}, 300, function() { $(this).removeAttr('style');});
                } else {
                    // Reset animated values.
                    $("#threadsWrapper .status").removeAttr('style');
                    $("#repliesWrapper .status").removeAttr('style');
                }
            }
            this.statusShowing = true;
        }
    },

    updateBubbleAndActionWidths: function() {
        const self = this;
        $('.forum .thread').each(function() {
            self.updateSingleBubbleAndActionWidth($(this));
        });

        $('.forum .reply').each(function() {
            self.updateSingleBubbleAndActionWidth($(this));
        });
    },

    updateSingleBubbleAndActionWidth: function(threadOrReply) {
        const actionCount = threadOrReply.find(".action:visible").length;
        threadOrReply.find(".container").removeClass("actionCount0 actionCount1 actionCount2 actionCount3 actionCount4 actionCount5 actionCount6 actionCount7").addClass("actionCount"+actionCount);
        threadOrReply.find(".actions").removeClass("actionCount0 actionCount1 actionCount2 actionCount3 actionCount4 actionCount5 actionCount6 actionCount7").addClass("actionCount"+actionCount);
    },

    updateModerationTooltips: function() {
        const self = this;
        $('.forum .thread').each(function() {
            self.updateModerationTooltip($(this));
        });

        $('.forum .reply').each(function() {
            self.updateModerationTooltip($(this));
        });
    },

    updateModerationTooltip: function(threadOrReply) {
        const data = threadOrReply.data();

        const hasBeenModerated = data.approved || data.deleted || data.banned || data.pinned || data.locked;

        const actions = threadOrReply.find(".moderatorActions");

        if (threadOrReply.hasClass("moderatable")) {

            if (!actions.hasClass("tooltipstered")) {
                actions.tooltipster({position: "top", offsetY: 5, theme: "tooltipster-admin", restoration: 'none', updateAnimation: null});
            }

            if (data.moderatedBy !== null) {
                Backend.getInstance().getPlayerDetails(
                    function(result) {
                        if (typeof(result) == "object") {
                            actions.tooltipster('content', 'Last moderated by ' + result.getUsername());
                        } else {
                            // Post was moderated, but something went wrong in retrieving username.
                            actions.tooltipster('content', 'Moderator not currently available');
                        }
                    },
                    null,
                    null,
                    data.moderatedBy,
                    Caches.getPlayerDetailsCache()
                );
            } else if (hasBeenModerated) {
                // Post was moderated, but the moderating user has been deleted.
                actions.tooltipster('content', 'Moderator has been scrapped');
            }
        } else {
            if (actions.hasClass("tooltipstered")) {
                actions.tooltipster('disable').tooltipster('destroy');
            }
        }
    }
});

var Forum = Classy.newClass().name('Forum');

Forum.fields({
    model: null,
    view: null,
    threadListSyncInterval: null,
    replyListSyncInterval: null,
    synchronizing: false,
    synchronizationCountdown: 0,
    cooldownInterval: null,
    cooldown: 0
});

Forum.classFields({
    instance: null,
    log: null
});

Forum.classMethods({
    getInstance: function() {
        if (Forum.instance==null) {
            Forum.instance = Forum.create();
        }

        // Setup log.
        if (Forum.log==null) {
            Forum.log = Log.create('Forum');
        }

        return Forum.instance;
    },

    initForum: function() {
        // Hook up mouseup events
        $('#createReplyButton').on("mouseup", function() {
            Forum.getInstance().createForumReply();
        });

        $('#createThreadButton').on("mouseup", function() {
            Forum.getInstance().createForumThread();
        });

        Forum.getInstance().view.hideComposeStatusAndSynchronizationInfo();

        UIPlayerPanel.insertPanel($("#playerPanel"), null);

        Utils.addAutomaticTextAreaResize($(".compose textarea"));

        $(".forum .button.back").tooltipster({position: "top"});

        Users.addEventListener(Forum._authenticationEventHandler, this);

        Forum.getInstance().checkCooldown(true);

        $('.compose .bubble textarea').mdeditor();
    },

    updateForum: function(data) {
        // FIXME Can this cause issues?
        //Forum.getInstance().stopSynchronization(true);

        Forum.getInstance().view.setSuppressNextUpdateAnimation();
        Forum.getInstance().view.setReplaceNextHistory();
        if (data.threadId && data.id) {
            Forum.getInstance().model.loadRepliesById(data.threadId, data.id);
        } else if (data.threadId) {
            Forum.getInstance().model.loadNewestReplies(data.threadId);
        } else if (data.id) {
            Forum.getInstance().model.loadThreadsById(data.id);
        } else {
            Forum.getInstance().model.loadNewestThreads();
        }
    },

    deinitForum: function() {
        UIPlayerPanel.removePanel();

        Utils.removeAutomaticTextAreaResize($(".compose textarea"));

        Forum.getInstance().stopSynchronization(false);

        Users.removeEventListener(Forum._authenticationEventHandler, this);
    },

    _authenticationEventHandler: function(self, evt, data) {
        switch(evt) {
            case Users.EVENTS.PLAYER_AUTHENTICATED:
            case Users.EVENTS.PLAYER_DEAUTHENTICATED:
            case Users.EVENTS.GUEST_ADDED:
            case Users.EVENTS.GUESTS_ADDED:
            case Users.EVENTS.GUEST_REMOVED:
            case Users.EVENTS.GUEST_SIGNED_UP:
            {
                Forum.getInstance().updateContent();
                break;
            }
        }
    }
});

Forum.constructor(function() {

    this.model = ForumModel.create();
    this.view = ForumView.create(this.model);
    this.model.addThreadListChangeListener(this.view);
    this.model.addReplyListChangeListener(this.view);
});

Forum.methods({

    refreshThreads: function() {
        this.view.setReplaceNextHistory();
        this.model.refreshThreads();
    },

    loadNewestThreads: function() {
        this.view.setReplaceNextHistory();
        this.model.loadNewestThreads();
    },

    loadOlderThreads: function(offset) {
        this.view.setReplaceNextHistory();
        this.model.loadOlderThreads(offset * this.model.getThreadRequestSize());
    },

    loadNewerThreads: function(offset) {
        this.view.setReplaceNextHistory();
        this.model.loadNewerThreads(offset * this.model.getThreadRequestSize());
    },

    refreshReplies: function() {
        this.view.setReplaceNextHistory();
        this.model.refreshReplies(this.model.getSelectedThread().id);
    },

    loadNewestReplies: function() {
        this.view.setReplaceNextHistory();
        this.model.loadNewestReplies(this.model.getSelectedThread().id);
    },

    loadOldestReplies: function() {
        this.view.setReplaceNextHistory();
        this.model.loadOldestReplies(this.model.getSelectedThread().id);
    },

    loadOlderReplies: function(offset) {
        this.view.setReplaceNextHistory();
        this.model.loadOlderReplies(this.model.getSelectedThread().id, offset * this.model.getReplyRequestSize());
    },

    loadNewerReplies: function(offset) {
        this.view.setReplaceNextHistory();
        this.model.loadNewerReplies(this.model.getSelectedThread().id, offset * this.model.getReplyRequestSize());
    },

    selectThread: function(threadId) {
        // Cancel selection of thread being edited.
        const threadBeingEdited = this.model.getThreadBeingEdited();
        if (threadBeingEdited != null && threadBeingEdited.id == threadId) {
            return;
        }

        this.stopSynchronization(true);
        this.model.selectThread(threadId);
    },

    leaveThread: function() {
        this.stopSynchronization(true);
        this.model.deselectThread();
    },

    startThreadEdit: function(threadId) {
        this.stopSynchronization(true);
        this.model.startThreadEdit(threadId);
    },

    startReplyEdit: function(replyId) {
        this.stopSynchronization(true);
        this.model.startReplyEdit(replyId);
    },

    cancelThreadEdit: function() {
        if (this.model.getTrackingNewestThreads()) {
            this.startThreadSynchronization(UIConstants.FORUM_THREAD_REFRESH_INTERVAL, true);
        }
        if (this.model.getTrackingNewestReplies()) {
            this.startReplySynchronization(UIConstants.FORUM_REPLY_REFRESH_INTERVAL, true);
        }
        this.model.cancelThreadEdit();
    },

    cancelReplyEdit: function() {
        if (this.model.getTrackingNewestReplies()) {
            this.startReplySynchronization(UIConstants.FORUM_REPLY_REFRESH_INTERVAL, true);
        }
        this.model.cancelReplyEdit();
    },

    isEditing: function() {
        return this.model.getThreadBeingEdited() != null || this.model.getReplyBeingEdited() != null;
    },

    getSelectedThreadReplyOffset: function() {
        return this.model.getSelectedThreadReplyOffset();
    },

    updateSynchronizationInfo: function(animate) {
        this.view.updateSynchronizationInfo(animate);
    },

    checkCooldown: function(refreshTempBanValidities) {
        const playerIds = Users.getAuthenticatedPlayerIds();

        if (playerIds.length == 0) {
            return;
        }

        if (refreshTempBanValidities) {
            Caches.getTempBanValidityCache().invalidateAll();
        }

        let numResponses = 0;
        const numExpectedResponses = playerIds.length + 1;
        const time = Math.floor(new Date().getTime() / 1000);
        const eligibleUsernameMap = {};
        for (let i = 0; i < playerIds.length; ++i) {
            eligibleUsernameMap[playerIds[i]] = {eligible: true, cooldown: 0};
        }
        for (let i = 0; i < playerIds.length; ++i) {
            Backend.getInstance().getPlayerDetails(
                function(result) {
                    if (typeof(result) == "object") {
                        // FIXME Cooldown should scale with karma.
                        eligibleUsernameMap[result.getPlayerId()].cooldown = result.getLastForumPost() + 30 - time;
                        if (!result.getVerified()) {
                            eligibleUsernameMap[result.getPlayerId()].eligible = false;
                        }
                    } else {
                        eligibleUsernameMap[result].eligible = false;
                    }
                },
                function(result) {
                },
                function(result) {
                    // Count that we got a response.
                    ++numResponses;

                    // If we have them all, update cooldown.
                    if (numResponses == numExpectedResponses) {
                        // FIXME Collect this in separate method for reuse.
                        // Find minimum eligible cooldown.
                        let cooldown = Number.MAX_VALUE;
                        for (const playerId in eligibleUsernameMap) {
                            if (eligibleUsernameMap[playerId].eligible) {
                                cooldown = Math.min(cooldown, eligibleUsernameMap[playerId].cooldown);
                            }
                        }
                        if (cooldown > 0) {
                            Forum.getInstance().startCooldown(cooldown, false);
                        } else {
                            Forum.getInstance().stopCooldown();
                        }
                    }
                },
                playerIds[i], Caches.getPlayerDetailsCache()
            );
        }
        Backend.getInstance().getNewestTempBanValidities(
            function(result) {
                if (typeof(result) == "object") {
                    for (const playerId in result) {
                        if (result[playerId] > time) {
                            eligibleUsernameMap[playerId].eligible = false;
                        }
                    }
                }
            },
            function(result) {
            },
            function(result) {
                // Count that we got a response.
                ++numResponses;

                // If we have them all, update compose and status.
                if (numResponses == numExpectedResponses) {
                    // FIXME Collect this in separate method for reuse.
                    // Find minimum eligible cooldown.
                    let cooldown = Number.MAX_VALUE;
                     for (playerId in eligibleUsernameMap) {
                        if (eligibleUsernameMap[playerId].eligible) {
                            cooldown = Math.min(cooldown, eligibleUsernameMap[playerId].cooldown);
                        }
                    }
                    if (cooldown > 0) {
                        Forum.getInstance().startCooldown(cooldown, true);
                    } else {
                        Forum.getInstance().stopCooldown();
                    }
                }
            },
            playerIds,
            Caches.getTempBanValidityCache()
        );

    },

    updateComposeAndStatus: function(animate, refreshTempBanValidities) {
        const playerIds = Users.getAuthenticatedPlayerIds();

        // Update compose fields.
        if (playerIds.length == 0) {
            this.view.updateComposeAndStatus({}, animate);
            return;
        }

        if (refreshTempBanValidities) {
            Caches.getTempBanValidityCache().invalidateAll();
        }

        const self = this;
        let numResponses = 0;
        const time = Math.floor(new Date().getTime() / 1000);
        const numExpectedResponses = playerIds.length + 1;
        const eligibleUsernameMap = {};
        for (let i = 0; i < playerIds.length; ++i) {
            eligibleUsernameMap[playerIds[i]] = {eligible: true, unverified: false, tempBanned: false, onCoolDown: false, username: ""};
        }
        for (let i = 0; i < playerIds.length; ++i) {
            Backend.getInstance().getPlayerDetails(
                function(result) {
                    if (typeof(result) == "object") {
                        eligibleUsernameMap[result.getPlayerId()].username = result.getUsername();
                        if (!result.getVerified()) {
                            eligibleUsernameMap[result.getPlayerId()].eligible = false;
                            eligibleUsernameMap[result.getPlayerId()].unverified = true;
                        }
                        // FIXME Cooldown should scale with karma.
                        if (result.getLastForumPost() + 30 - time > 0) {
                            eligibleUsernameMap[result.getPlayerId()].eligible = false;
                            eligibleUsernameMap[result.getPlayerId()].onCoolDown = true;
                        }
                    } else {
                        eligibleUsernameMap[result].eligible = false;
                    }
                },
                function(result) {
                },
                function(result) {
                    // Count that we got a response.
                    ++numResponses;

                    // If we have them all, update compose and status.
                    if (numResponses == numExpectedResponses) {
                        self.view.updateComposeAndStatus(eligibleUsernameMap, animate);
                    }
                },
                playerIds[i], Caches.getPlayerDetailsCache()
            );
        }
        Backend.getInstance().getNewestTempBanValidities(
            function(result) {
                if (typeof(result) == "object") {
                    for (const playerId in result) {
                        if (result[playerId] > time) {
                            eligibleUsernameMap[playerId].eligible = false;
                            eligibleUsernameMap[playerId].tempBanned = true;
                        }
                    }
                }
            },
            function(result) {
            },
            function(result) {
                // Count that we got a response.
                ++numResponses;

                // If we have them all, update compose and status.
                if (numResponses == numExpectedResponses) {
                    self.view.updateComposeAndStatus(eligibleUsernameMap, animate);
                }
            },
            playerIds,
            Caches.getTempBanValidityCache()
        );
    },

    updateContent: function() {
        const playerIds = Users.getAuthenticatedPlayerIds();

        this.updateEditing(playerIds);

        // Update visible content.
        if (this.view.getState() == ForumView.STATE_REPLYLIST) {
            if (this.model.getTrackingNewestReplies()) {
                Forum.log.debug("REFRESH");
                this.model.refreshReplies(this.model.getSelectedThread().id);
            } else {
                Forum.log.debug("LOAD BY ID " + this.model.getCurrentReplyWindowOldestId());
                this.model.loadRepliesById(
                    this.model.getSelectedThread().id,
                    this.model.getCurrentReplyWindowOldestId()
                );
            }
        } else {
            if (this.model.getTrackingNewestThreads()) {
                Forum.log.debug("REFRESH");
                this.model.refreshThreads();
            } else {
                Forum.log.debug("LOAD BY ID " + this.model.getCurrentThreadWindowNewestThreadId());
                this.model.loadThreadsById(this.model.getCurrentThreadWindowNewestThreadId());
            }
        }

        // This will also update compose and status.
        Forum.getInstance().checkCooldown(true);
    },

    updateEditing: function(playerIds) {
        // Check if any editing should be cancelled due to the last author having logged out.
        const thread = this.model.getThreadBeingEdited();
        if (thread) {
            let cancelEdit = true;
            for (let i = 0; i < playerIds.length; ++i) {
                if (playerIds[i] == thread.creator ||
                    playerIds[i] == thread.coCreator1 ||
                    playerIds[i] == thread.coCreator2) {

                    cancelEdit = false;
                    break;
                }
            }

            if (cancelEdit) {
                this.cancelThreadEdit();
            }
        }

        const reply = this.model.getReplyBeingEdited();
        if (reply) {
            let cancelEdit = true;
            for (let i = 0; i < playerIds.length; ++i) {
                if (playerIds[i] == reply.creator ||
                    playerIds[i] == reply.coCreator1 ||
                    playerIds[i] == reply.coCreator2) {

                    cancelEdit = false;
                    break;
                }
            }

            if (cancelEdit) {
                this.cancelReplyEdit();
            }
        }
    },

    startThreadSynchronization: function(seconds, animate) {
        this.synchronizing = true;
        this.synchronizationCountdown = seconds;

        if (this.replyListSyncInterval) {
            clearInterval(this.replyListSyncInterval);
            this.replyListSyncInterval = null;
        }

        if (!this.threadListSyncInterval) {
            this.threadListSyncInterval = setInterval(
                function() {
                    Forum.getInstance().countThreadSynchronization();
                },
                1000
            );

            Forum.getInstance().updateSynchronizationInfo(animate);
        }
    },

    countThreadSynchronization: function() {
        --this.synchronizationCountdown;
        if (this.synchronizationCountdown <= 0) {
            Forum.getInstance().refreshThreads();
            Forum.getInstance().updateSynchronizationInfo(true);
        } else {
            Forum.getInstance().updateSynchronizationInfo(false);
        }
    },

    startReplySynchronization: function(seconds, animate) {
        this.synchronizing = true;
        this.synchronizationCountdown = seconds;

        if (this.threadListSyncInterval) {
            clearInterval(this.threadListSyncInterval);
            this.threadListSyncInterval = null;
        }

        if (!this.replyListSyncInterval) {
            this.replyListSyncInterval = setInterval(
                function() {
                    Forum.getInstance().countReplySynchronization();
                },
                1000
            );

            Forum.getInstance().updateSynchronizationInfo(animate);
        }
    },

    countReplySynchronization: function() {
        --this.synchronizationCountdown;
        if (this.synchronizationCountdown <= 0) {
            Forum.getInstance().refreshReplies();
            Forum.getInstance().updateSynchronizationInfo(true);
        } else {
            Forum.getInstance().updateSynchronizationInfo(false);
        }
    },

    stopSynchronization: function(animate) {
        this.synchronizing = false;
        this.synchronizationCountdown = 0;

        if (this.threadListSyncInterval) {
            clearInterval(this.threadListSyncInterval);
            this.threadListSyncInterval = null;
        }
        if (this.replyListSyncInterval) {
            clearInterval(this.replyListSyncInterval);
            this.replyListSyncInterval = null;
        }

        Forum.getInstance().updateSynchronizationInfo(animate);
    },

    getSynchronizationText: function() {
        let result = "";
        if (this.synchronizationCountdown > 0) {
            result = "in " + this.synchronizationCountdown + " second" + (this.synchronizationCountdown == 1 ? "" : "s");
        } else {
            result = "now";
        }
        return result;
    },

    isSynchronizing: function() {
        return this.synchronizing;
    },

    startCooldown: function(seconds, animate) {
        this.cooldown = seconds;

        if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval);
            this.cooldownInterval = null;
        }

        this.cooldownInterval = setInterval(
            function() {
                Forum.getInstance().countCooldown();
            },
            1000
        );

        Forum.getInstance().updateComposeAndStatus(animate, false);
    },

    stopCooldown: function() {
        this.cooldown = 0;
        if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval);
            this.cooldownInterval = null;
        }

        Forum.getInstance().updateComposeAndStatus(true, false);
    },

    countCooldown: function() {
        --this.cooldown;
        if (this.cooldown <= 0) {
            clearInterval(this.cooldownInterval);
            this.cooldownInterval = null;
            Forum.getInstance().updateComposeAndStatus(true, false);
        } else {
            Forum.getInstance().updateComposeAndStatus(false, false);
        }
    },

    getCooldownText: function() {
        const result = this.cooldown + " second" + (this.cooldown == 1 ? "" : "s");
        return result;
    },

    isCooledDown: function() {
        return this.cooldown <= 0;
    },

    editForumReply: function() {
        const self = this;

        const threadId = this.model.getSelectedThread().id;
        const replyId = this.model.getReplyBeingEdited().id;
        // FIXME Supply the message to the function to decrease coupling.
        const message = $('.reply .edit:visible textarea').val().trim();
        // Don't perform input validation on the client,
        // to avoid inconsistencies between server and client
        // validation
        Backend.getInstance().editForumReply(
            function(res) {
                if (res.result.result) {
                    if (self.model.getTrackingNewestReplies()) {
                        self.startReplySynchronization(UIConstants.FORUM_REPLY_REFRESH_INTERVAL, true);
                    }
                    self.model.finishReplyEdit(res.result.data);
                } else {
                    TankTrouble.ErrorBox.show(res.result.message);
                }
            },
            function(res) {},
            function(res) {},
            threadId,
            replyId,
            message
        );
    },

    editForumThread: function() {
        const self = this;

        const threadId = this.model.getThreadBeingEdited().id;
        // FIXME Supply the header and message to the function to decrease coupling.
        const header = $('.thread .edit:visible input').val().trim();
        const message = $('.thread .edit:visible textarea').val().trim();
        // Don't perform input validation on the client,
        // to avoid inconsistencies between server and client
        // validation
        Backend.getInstance().editForumThread(
            function(res) {
                if (res.result.result) {
                    if (self.model.getTrackingNewestThreads()) {
                        self.startThreadSynchronization(UIConstants.FORUM_THREAD_REFRESH_INTERVAL, true);
                    }
                    if (self.model.getTrackingNewestReplies()) {
                        self.startReplySynchronization(UIConstants.FORUM_REPLY_REFRESH_INTERVAL, true);
                    }
                    self.model.finishThreadEdit(res.result.data);
                } else {
                    TankTrouble.ErrorBox.show(res.result.message);
                }
            },
            function(res) {},
            function(res) {},
            threadId,
            header,
            message
        );
    },

    createForumReply: function() {
        const threadId = this.model.getSelectedThread().id;
        // FIXME Supply the message to the function to decrease coupling.
        const message = $('#repliesWrapper .compose textarea').val().trim();
        $('#createReplyButton').prop("disabled", true);
        // Don't perform input validation on the client,
        // to avoid inconsistencies between server and client
        // validation
        Backend.getInstance().createForumReply(
            function(result) {
                if (typeof(result) == "number") {
                    Forum.getInstance().refreshReplies();
                    Forum.getInstance().startCooldown(result, true);
                    $('#repliesWrapper .compose textarea').val("");
                } else {
                    TankTrouble.ErrorBox.show(result);
                }
            },
            function(result) {},
            function(result) {
                $('#createReplyButton').prop("disabled", false);
            },
            threadId,
            message,
            Caches.getPlayerDetailsCache()
        );
    },

    createForumThread: function () {
        /**
         *
         * @type {string}
         */
         // FIXME Supply the header and message to the function to decrease coupling.
        const header = $('#threadsWrapper .compose input').val().trim();
        const message = $('#threadsWrapper .compose textarea').val().trim();
        $('#createThreadButton').prop("disabled", true);
        // Don't perform input validation on the client,
        // to avoid inconsistencies between server and client
        // validation
        Backend.getInstance().createForumThread(
            function(result) {
                if (typeof(result) == "number") {
                    Forum.getInstance().refreshThreads();
                    Forum.getInstance().startCooldown(result, true);
                    $('#threadsWrapper .compose input').val("");
                    $('#threadsWrapper .compose textarea').val("");
                } else {
                    TankTrouble.ErrorBox.show(result);
                }
            },
            function(result) {
            },
            function(result) {
                $('#createThreadButton').prop("disabled", false);
            },
            header,
            message,
            Caches.getPlayerDetailsCache()
        );

    },

    toggleThreadLike: function(threadId) {
        // Obtain current like state.
        const liked = $("#thread-" +threadId).hasClass("liked");

        const self = this;
        Backend.getInstance().setForumThreadLiked(
            function (res) {
                // FIXME Handle error messages
                if (res.result.result) {
                    self.model.updateThread(res.result.data);
                }
            },
            function (res) {

            },
            function (res) {

            },
            threadId,
            !liked
        );
    },

    toggleReplyLike: function(threadId, replyId) {
        // Obtain current like state.
        const liked = $("#reply-" +replyId).hasClass("liked");

        const self = this;
        Backend.getInstance().setForumReplyLiked(
            function (res) {
                // FIXME Handle error messages
                if (res.result.result) {
                    self.model.updateReply(res.result.data);
                }
            },
            function (res) {

            },
            function (res) {

            },
            threadId,
            replyId,
            !liked
        );
    },

    setForumThreadApproved: function(threadId, value) {
        const self = this;
        Backend.getInstance().setForumThreadApproved(
            function (res) {
                // FIXME Handle error messages
                if (res.result.result) {
                    self.model.updateThread(res.result.data);
                }
            },
            function (res) {

            },
            function (res) {

            },
            threadId,
            value
        );
    },

    setForumThreadLocked: function(threadId, value) {
        const self = this;
        Backend.getInstance().setForumThreadLocked(
            function (res) {
                // FIXME Handle error messages
                if (res.result.result) {
                    self.model.updateThread(res.result.data);
                }
            },
            function (res) {

            },
            function (res) {

            },
            threadId,
            value
        );
    },

    setForumThreadPinned: function(threadId, value) {
        const self = this;
        Backend.getInstance().setForumThreadPinned(
            function (res) {
                // FIXME Handle error messages
                if (res.result.result) {
                    self.model.updateThread(res.result.data);
                }
            },
            function (res) {

            },
            function (res) {

            },
            threadId,
            value
        );
    },

    setForumThreadDeleted: function(threadId, value) {
        const self = this;
        Backend.getInstance().setForumThreadDeleted(
            function (res) {
                // FIXME Handle error messages
                if (res.result.result) {
                    self.model.updateThread(res.result.data);
                }
            },
            function (res) {

            },
            function (res) {

            },
            threadId,
            value
        );
    },

    setForumThreadBanned: function(threadId, value) {
        const self = this;
        Backend.getInstance().setForumThreadBanned(
            function (res) {
                // FIXME Handle error messages
                if (res.result.result) {
                    self.model.updateThread(res.result.data);
                }
            },
            function (res) {

            },
            function (res) {

            },
            threadId,
            value
        );
    },

    setForumReplyApproved: function(threadId, replyId, value) {
        const self = this;
        Backend.getInstance().setForumReplyApproved(
            function (res) {
                // FIXME Handle error messages
                if (res.result.result) {
                    self.model.updateReply(res.result.data);
                }
            },
            function (res) {

            },
            function (res) {

            },
            threadId,
            replyId,
            value
        );
    },

    setForumReplyDeleted: function(threadId, replyId, value) {
        const self = this;
        Backend.getInstance().setForumReplyDeleted(
            function (res) {
                // FIXME Handle error messages
                if (res.result.result) {
                    self.model.updateReply(res.result.data);
                }
            },
            function (res) {

            },
            function (res) {

            },
            threadId,
            replyId,
            value
        );
    },

    setForumReplyBanned: function(threadId, replyId, value) {
        const self = this;
        Backend.getInstance().setForumReplyBanned(
            function (res) {
                // FIXME Handle error messages
                if (res.result.result) {
                    self.model.updateReply(res.result.data);
                }
            },
            function (res) {

            },
            function (res) {

            },
            threadId,
            replyId,
            value
        );
    }
});
