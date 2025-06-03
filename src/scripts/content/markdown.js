import { StoreEvent, get, onStateChange } from '../common/store.js';
import {
	gfmAutolinkLiteral,
	gfmAutolinkLiteralHtml
} from 'micromark-extension-gfm-autolink-literal';
import { micromark } from 'micromark';

/**
 * Micromark extension to match newlines to the native forum layout
 * @param {string} text Text of markdown object
 * @returns {object} Extension
 */
const gfmFixNewlines = text => {
	/**
	 * Get the nth line of the text
	 * @private
	 * @param {number} line Line index
	 * @returns {string|null} Line content or null
	 */
	const getLine = line => {
		const lines = text.split('\n');
		return typeof lines[line] !== 'undefined' ? `${lines[line]  }\n` : null;
	};

	return {
		// Preserve forum post newlines
		enter: {
			lineEnding(token) {
				this.raw(
					getLine(token.start.line).trim() === ''
						? ''
						: '<br>'
				);
			},
			lineEndingBlank() {
				this.raw('<br>');
			}
		}
	};
};

/**
 * Refresh code block appearances based on the site theme
 * @param {HTMLElement} cmInstance CodeMirror HTMLElement instance
 * @param {boolean} isDarkTheme Is the site dark?
 */
const refreshCodeMirrorTheme = (cmInstance, isDarkTheme) => {
	cmInstance.classList.replace(
		isDarkTheme ? 'cm-s-default' : 'cm-s-blackboard',
		isDarkTheme ? 'cm-s-blackboard' : 'cm-s-default'
	);
};

/**
 * Function to set up an event listener that updates all
 * @param {HTMLElement} markdownElement Target element which codeblocks to update
 */
export const setupCmThemeUpdate = markdownElement => {
	onStateChange(change => {
		const { detail } = change;

		if (
			detail?.type === StoreEvent.STORE_CHANGE
			&& detail.data
			&& detail.data.curr.theme ) {
			const { curr } = detail.data;

			for (const node of markdownElement.querySelectorAll('code .CodeMirror'))
				refreshCodeMirrorTheme(node, curr.theme.colorScheme === 'dark');
		}
	});

	get('theme').then(({ colorScheme }) => {
		for (const node of markdownElement.querySelectorAll('code .CodeMirror'))
			refreshCodeMirrorTheme(node, colorScheme === 'dark');
	});
};

/**
 * Initialize codemirror for all codeblocks in the post
 * @private
 * @param {HTMLElement} markdownElement Markdown rendered element
 */
const initializeCodeBlocks = markdownElement => {
	const codeblocks = markdownElement.querySelectorAll('pre code');
	for (const codeblock of codeblocks) {
		const value = codeblock.textContent;
		const [, language] = codeblock.className.split('-');
		codeblock.innerHTML = '';

		const isDarkTheme = document.documentElement.classList.contains('dark');

		// eslint-disable-next-line new-cap
		const editor = CodeMirror(codeblock, {
			value,
			mode: language || 'javacript',
			theme: isDarkTheme ? 'blackboard' : 'default',
			lineNumbers: false,
			readOnly: true
		});

		// https://stackoverflow.com/questions/8349571/codemirror-editor-is-not-loading-content-until-clicked
		setTimeout(() => {
			// Refresh CodeMirror to render it
			editor.refresh();

			// Refresh theme
			setupCmThemeUpdate(markdownElement);
		}, 1);
	}
};

/**
 * Render markdown on an element
 * @private
 * @param {HTMLElement} element Target element
 * @param {string} text Markdown text
 */
export const renderMarkdown = (element, text) => {
	element.innerHTML = micromark(text, {
		lineEndingStyle: '<br>',
		extensions: [gfmAutolinkLiteral()],
		htmlExtensions: [
			gfmAutolinkLiteralHtml(),
			gfmFixNewlines(text)
		]
	});

	initializeCodeBlocks(element);
};

export const _isESmodule = true;
