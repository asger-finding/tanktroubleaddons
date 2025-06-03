import { renderMarkdown } from './markdown.js';

// eslint-disable-next-line id-length
($ => {
	const pluginName = 'mdeditor';

	/** @type {const} */
	const editorDefs = {
		MARKDOWN: 1,
		PREVIEW: 2,
		SELECTION_ALL: 1,
		SELECTION_NONE: 2,
		SELECTION_INSIDE: 3,
		SELECTION_BEFORE_START: 5,
		SELECTION_AFTER_START: 6,
		SELECTION_BEFORE_END: 7,
		SELECTION_AFTER_END: 8,
		TOOLBAR_CLASS: 'mdeditor-toolbar',
		PREVIEW_CLASS: 'mdeditor-preview',
		PREVIEW_EMPTY_CLASS: 'mdeditor-preview-empty',
		TOOL_CLASS: 'mdeditor-toolbar-tool',
		separator_CLASS: 'mdeditor-toolbar-separator'
	};

	/** @type {Record<string, {start?: string, end?: string, display: string, type: number, selection: number, separator?: boolean}>} */
	const toolbarConfig = {
		'Preview Markdown': { display: 'preview.svg', type: editorDefs.PREVIEW, selection: editorDefs.SELECTION_NONE, separator: true },
		'Subheading':       { start: '## ', end: '', display: 'heading.svg', type: editorDefs.MARKDOWN, selection: editorDefs.SELECTION_INSIDE },
		'Bold':             { start: '**', end: '**', display: 'bold.svg', type: editorDefs.MARKDOWN, selection: editorDefs.SELECTION_INSIDE },
		'Italic':           { start: '*', end: '*', display: 'italic.svg', type: editorDefs.MARKDOWN, selection: editorDefs.SELECTION_INSIDE, separator: true },
		'Blockquote':       { start: '> ', end: '', display: 'blockquote.svg', type: editorDefs.MARKDOWN, selection: editorDefs.SELECTION_AFTER_END },
		'Embed image':      { start: '![caption](url', end: ')', display: 'image.svg', type: editorDefs.MARKDOWN, selection: editorDefs.SELECTION_INSIDE },
		'Clickable link':   { start: '[text][(url', end: ')', display: 'link.svg', type: editorDefs.MARKDOWN, selection: editorDefs.SELECTION_INSIDE, separator: true },
		'Code':             { start: '`', end: '`', display: 'code.svg', type: editorDefs.MARKDOWN, selection: editorDefs.SELECTION_INSIDE },
		'Code Block':       { start: '```javascript|css|html\n', end: '\n```', display: 'codeblock.svg', type: editorDefs.MARKDOWN, selection: editorDefs.SELECTION_INSIDE, separator: true },
		'Horizontal Rule':  { start: '\n---\n\n', end: '', display: 'horizontal-rule.svg', type: editorDefs.MARKDOWN, selection: editorDefs.SELECTION_AFTER_END }
	};

	/**
	 * @param {JQuery} textarea Markdown editor textarea
	 * @param {string} startSyntax Before of the insert syntax
	 * @param {string} endSyntax After of the insert syntax
	 * @param {{start: number, end: number}} selection User selection
	 * @returns {string} Text with insert
	 */
	const insertMarkdownSyntax = (textarea, startSyntax, endSyntax, { start, end }) => {
		const val = textarea.val();
		return val.slice(0, start) + startSyntax + val.slice(start, end) + endSyntax + val.slice(end);
	};

	/**
	 * @param {JQuery} textarea Markdown editor textarea
	 * @param {number} type Selection type
	 * @param {{start: number, end: number, startLen: number, endLen: number}} params Params for the selection type
	 */
	const setSelection = (textarea, type, params) => {
		const range = { start: 0, end: 0 };
		switch (type) {
			case editorDefs.SELECTION_ALL:
				range.start = params.start;
				range.end = params.end + params.startLen + params.endLen;
				break;
			case editorDefs.SELECTION_NONE:
				textarea.trigger('blur');
				return;
			case editorDefs.SELECTION_INSIDE:
				range.start = params.start + params.startLen;
				range.end = params.end + params.startLen;
				break;
			case editorDefs.SELECTION_BEFORE_START:
				range.start = params.start;
				range.end = params.start;
				break;
			case editorDefs.SELECTION_AFTER_START:
				range.start = params.start + params.startLen;
				range.end = range.start;
				break;
			case editorDefs.SELECTION_BEFORE_END:
				range.start = params.end + params.startLen;
				range.end = range.start;
				break;
			case editorDefs.SELECTION_AFTER_END:
				range.start = params.end + params.startLen + params.endLen;
				range.end = range.start;
				break;
			default:
				break;
		}
		textarea.trigger('focus')[0].setSelectionRange(range.start, range.end);
	};

	/**
	 * @param {JQuery} textarea Markdown editor textarea
	 * @returns {{start: number, end: number}} User selection start and end
	 */
	const getSelection = textarea => ({
		start: textarea.prop('selectionStart'),
		end: textarea.prop('selectionEnd')
	});

	/**
	 * Initialize the markdown editor
	 * @param {JQuery} target Editor target textarea
	 */
	const initEditor = target => {
		const textarea = target;

		const toolbar = $(`<div class="${editorDefs.TOOLBAR_CLASS}"></div>`);
		const preview = $(`<div class="${editorDefs.PREVIEW_CLASS}"></div>`);

		Object.entries(toolbarConfig).forEach(([name, data]) => {
			const tool = $(`<div class="${editorDefs.TOOL_CLASS}"></div>`);

			if (data.display.endsWith('.svg')) {
				$.get(Addons.t_url(`assets/mdeditor/${data.display}`), result => {
					tool.append(result);
				}, 'text');
			} else {
				tool.text(data.display);
			}

			tool.tooltipster({ position: 'top' });
			tool.tooltipster('content', name);

			tool.on('mouseup', evt => {
				evt.preventDefault();

				if (data.type === editorDefs.MARKDOWN) {
					const selection = getSelection(textarea);
					const newVal = insertMarkdownSyntax(textarea, data.start, data.end, selection);
					textarea.val(newVal).trigger('input.resize');
					setSelection(textarea, data.selection, { ...selection, startLen: data.start.length, endLen: data.end.length });
				} else if (data.type === editorDefs.PREVIEW) {
					preview.empty();
					preview.add(textarea).toggle();

					renderMarkdown(preview[0], textarea.val() || 'Nothing to preview yet...');

					tool.toggleClass('active');
				}
			});

			toolbar.append(tool);
			if (data.separator) toolbar.append(`<div class="${editorDefs.separator_CLASS}"></div>`);
		});

		textarea.before(toolbar);
		textarea.after(preview);
		preview.toggle();

		textarea.data(`${pluginName}-initialized`, true);
	};

	/**
	 * jQuery plugin initializer
	 * @param {string} method Call method
	 * @returns {JQuery} Method action result
	 */
	$.fn[pluginName] = function(method) {
		switch (method) {
			case 'remove':
				return this.each(function() {
					const $this = $(this);
					if (!$this.data(`${pluginName}-initialized`)) return;

					$this.siblings(`.${editorDefs.TOOLBAR_CLASS}, .${editorDefs.PREVIEW_CLASS}`).remove();
					$this.show();
					$this.removeData(`${pluginName}-initialized`);
				});
			case 'init':
			default:
				return this.each(function() {
					const $this = $(this);
					if ($this.data(`${pluginName}-initialized`)) return;

					initEditor($this);
				});
		}
	};

})(jQuery);

export const _isESmodule = true;
