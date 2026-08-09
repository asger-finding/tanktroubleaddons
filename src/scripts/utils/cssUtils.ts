type PackFiles = Record<string, Uint8Array<ArrayBuffer>>;

const mimeTypes: Record<string, string> = {
	avif: 'image/avif',
	gif: 'image/gif',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	otf: 'font/otf',
	png: 'image/png',
	svg: 'image/svg+xml',
	ttf: 'font/ttf',
	webp: 'image/webp',
	woff: 'font/woff',
	woff2: 'font/woff2'
};

const urlToken = /url\(\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)'|(?<bare>[^)]*))\s*\)/gu;
const imageSet = /(?:-webkit-)?image-set\([^)]*\)/giu;
const quotedString = /(?<quote>['"])(?<path>[^'"]*)\k<quote>/gu;
const dataUrl = /^data:/iu;

/**
 * Look up a resource pack file referenced by a css url
 * @param path Path from a url() token
 * @param files Resource pack files keyed by path
 * @returns Matching file key, or null if the path is not in the pack
 */
const resolvePackPath = (path: string, files: PackFiles): string | null => {
	let candidate = path.trim().replace(/^\.?\//u, '');

	try {
		candidate = decodeURIComponent(candidate);
	} catch {
		// Not valid percent-encoding, so match on the raw path
	}

	return Object.prototype.hasOwnProperty.call(files, candidate) ? candidate : null;
};

/**
 * Wrap a resource pack file in an object url
 * @param key File key in the pack
 * @param files Resource pack files keyed by path
 * @returns Object url for the file
 */
const createObjectURL = (key: string, files: PackFiles): string => {
	const extension = key.slice(key.lastIndexOf('.') + 1).toLowerCase();
	const type = mimeTypes[extension] ?? 'application/octet-stream';

	return URL.createObjectURL(new Blob([files[key]], { type }));
};

/**
 * Rewrite bare strings in image-set() to url(), which url rewriting then covers
 * @param text Serialized stylesheet
 * @returns Stylesheet where every image-set entry is a url()
 */
const normalizeImageSets = (text: string) => text.replace(imageSet, entry =>
	entry.replace(quotedString, (...args: unknown[]) => {
		const groups = args.at(-1) as Record<string, string>;

		return `url(${ groups.quote }${ groups.path }${ groups.quote })`;
	}));

/**
 * Point every url at the pack file it names, or at about:invalid when it names
 * something else, so no declaration can reach the network
 * @param text Serialized stylesheet
 * @param files Resource pack files keyed by path
 * @param urls Collector that receives every created object url
 * @param dropped Collector that receives every path that was neutralised
 * @returns Stylesheet with no url reaching outside the pack
 */
const rewriteUrls = (text: string, files: PackFiles, urls: string[], dropped: string[]) =>
	text.replace(urlToken, (match: string, ...args: unknown[]) => {
		const groups = args.at(-1) as Record<string, string | undefined>;
		const path = groups.double ?? groups.single ?? groups.bare ?? '';

		if (dataUrl.test(path.trim())) return match;

		const key = resolvePackPath(path, files);
		if (key === null) {
			dropped.push(path);
			return 'url("about:invalid")';
		}

		const url = createObjectURL(key, files);
		urls.push(url);

		return `url("${ url }")`;
	});

/**
 * Restrict resource pack css to the pack itself, rewriting pack-relative urls to
 * object urls and neutralising any url that points outside the pack
 * @param css Raw stylesheet from the resource pack
 * @param files Resource pack files keyed by path
 * @returns Sanitized stylesheet, the object urls it references and the paths it dropped
 */
export const sanitizeResourcePackCSS = (css: string, files: PackFiles) => {
	const urls: string[] = [];
	const dropped: string[] = [];
	const sheet = new CSSStyleSheet();

	// Parsing drops @import, and serializing back resolves escaped url tokens
	try {
		sheet.replaceSync(css);
	} catch {
		return { css: '', urls, dropped };
	}

	const serialized = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');

	return {
		css: rewriteUrls(normalizeImageSets(serialized), files, urls, dropped),
		urls,
		dropped: [...new Set(dropped)]
	};
};

export const _isESmodule = true;
