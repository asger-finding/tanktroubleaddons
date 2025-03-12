const { src, dest, watch: gulpWatch, series, parallel } = require('gulp');
const { dirname, basename, extname } = require('path');
const yargs = require('yargs');
const package = require('./package.json');
const del = require('del');
const gulpif = require('gulp-if');
const changed = require('gulp-changed');
const postCSS = require('gulp-postcss');
const sass = require('gulp-sass')(require('sass-embedded'));
const autoprefixer = require('autoprefixer');
const htmlmin = require('gulp-htmlmin');
const jeditor = require('gulp-json-editor');
const yaml = require('gulp-yaml');
const avif = require('gulp-avif');
const esbuild = require('esbuild');
const tinyLr = require('tiny-lr');
// eslint-disable-next-line @typescript-eslint/naming-convention
const { Transform } = require('stream');

const origin = './src';
const paths = {
	manifest: `${origin}/manifest*.@(yml|yaml)`,
	excludePattern: '**/DELETEME.*',
	files: {
		script: `${origin}/**/*.@(js|ts)`,
		styles: [`${origin}/css/styles.scss`, `${origin}/css/*.css`],
		html: `${origin}/html/*.html`,
		assets: `${origin}/assets/**/*.@(avif|gif|svg|zip)`,
		bitmap: `${origin}/assets/**/*.@(png|jpg|jpeg)`,
		meta: `${origin}/meta/**/*`,
		json: `${origin}/**/*.json`
	},
	baseBuild: './build',
	baseDist: './dist',
	build: './build',
	dist: './dist',
	get target() {
		return this.mvTarget;
	},
	set target(target) {
		this.mvTarget = target;
		this.build = `${this.baseBuild}/${target}`;
		this.dist = `${this.baseDist}/${target}`;
	}
};

const state = {
	DEV: 'dev',
	PRODUCTION: 'production',

	get _defaultState() {
		return this.DEV;
	},
	get current() {
		return yargs.argv.state || this[this._defaultState];
	},
	get isDev() {
		return this.current === this.DEV;
	},
	get isProd() {
		return this.current === this.PRODUCTION;
	},
	get dest() {
		return this.prod ? paths.dist : paths.build;
	}
};

paths.target = yargs.argv.target || 'mv3';

const contentHMR = `// HMR Content Inject
// ==Start==
(() => {
	if (!('browser' in self)) self.browser = self.chrome;

	new WebSocket('ws://localhost:35729').addEventListener('message', event => {
		let data = null;
		try {
			data = JSON.parse(event.data);
		} catch (err) {
			console.error('JSON.parse failed on data received to HMR'); 
		}
		if (data !== null && data.command === 'reload') {
			browser.runtime.sendMessage('hmr')
		}
	});
})();
// ==/End==`;

const backgroundHMR = `// HMR Background Inject
// ==Start==
(() => {
	if (!('browser' in self)) self.browser = self.chrome;

	const reloadTankTrouble = () => browser.tabs.query({ url: "*://*.tanktrouble.com/*" }).then(tabs => {
		for (const tab of tabs) browser.tabs.reload(tab.id, { bypassCache: true })
	});

	// Keep extension active
	const keepAlive = () => setInterval(browser.runtime.getPlatformInfo, 20_000);
	browser.runtime.onStartup.addListener(keepAlive);
	keepAlive();

	browser.runtime.onInstalled.addListener((details) => {
		if (details.reason === browser.runtime.OnInstalledReason.UPDATE) reloadTankTrouble();
	});

	browser.runtime.onMessage.addListener(message => {
		if (message === 'hmr') reloadTankTrouble();
	});
})();
// ==/End==`;

let server = null;

/**
 * Setup the Live Reload server.
 *
 * We only do this when needed, else the open server
 * will stop the gulp process from exiting on its own
 * when we otherwise want it to.
 */
const setupLiveReload = async() => {
	server = tinyLr({ port: 35729 });
	server.listen(35729, () => {});
};

/**
 * Match a filename against the exclude schema for manifest-version specific files
 *
 * For example, manifest_mv2.yml will get ignored when compiling for mv3.
 * @returns Exclude schema plugin
 */
const excludeFiles = () => new Transform({
	objectMode: true,

	transform(file, _enc, callback) {
		// Separate path
		const ext = extname(file.path);
		const dir = dirname(file.path);
		const base = basename(file.path, ext);

		// Match for exclude term,
		// then ignore file
		const [strippedBase, mv] = base.split('_');
		if (mv && mv !== paths.mvTarget) return callback();

		// Join back path without the term
		file.path = `${ dir }/${ strippedBase }${ext}`;

		return callback(null, file);
	}
});

/**
 * Passes files through an esbuild pipeline that:
 * - Transpiles TS down to JavaScript,
 * - Resolves and bundles imported code in non-module scripts.
 *   This is handled through scripts declaring a `const _isESmodule = true` export
 * - Bundles imported node modules in all files
 * @returns Script transform plugin
 */
const esbuildTransform = () => new Transform({
	objectMode: true,

	async transform(file, _enc, callback) {
		const config = {
			stdin: {
				contents: String(file.contents),
				resolveDir: dirname(file.path),
				loader: 'ts',
				sourcefile: file.path
			},
			minify: state.isProd,
			bundle: false,
			write: false,
			metafile: true,
			platform: 'browser',
			format: 'esm',
			loader: {
				'.js': 'js',
				'.ts': 'ts'
			}
		};

		// If file is type module (capable of using import statements),
		// then we only need to pack node_modules, else we pack everything
		const { metafile } = await esbuild.build(config);
		const isModule = Object.values(metafile.outputs)
			.some(({ exports }) => exports.includes('_isESmodule'));

		esbuild.build({
			...config,
			bundle: true,
			metafile: false,
			plugins: [{
				name: 'bundle-only-node-modules',
				setup(build) {
					build.onResolve({ filter: /[\s\S]*/u }, ({ path }) => {
						const external = isModule ? /^(?:\.\/|\.\.\/)/u.test(path) : false;
						return { external };
					});
				}
			}]
		}).then(result => {
			file.contents = Buffer.from(result.outputFiles[0].text);

			if (file.extname === '.ts') file.extname = '.js';

			callback(null, file);
		}).catch(err => {
			callback(err);
		});
	}
});

/**
 * Insert the code required for hot module reloading.
 *
 * Matches the comment blocks and replaces with the inserts.
 * @returns Hot module code insert plugin
 */
const insertHotModuleReload = () => new Transform({
	objectMode: true,

	transform(file, _enc, callback) {
		file.contents = Buffer.from(String(file.contents)
			.replace('//# HMRContent', contentHMR)
			.replace('//# HMRBackground', backgroundHMR)
		);

		callback(null, file);
	}
});

/**
 * Use an angular-syntax to modify code conditionally whether dev or prod
 * Syntax: `{{VALUE1|VALUE2}}` inline
 * @returns Code with replacements
 */
const conditionalReplacement = () => new Transform({
	objectMode: true,

	transform(file, _enc, callback) {
		/**
		 * Replace conditional values in a file.
		 * Syntax: `{{VALUE1|VALUE2}}`
		 * @param {string} input Input string value
		 * @param {string} sec Pick first or second value in syntax (`VALUE1` or `VALUE2`)
		 * @returns {string} String with syntax replaced
		 */
		const replaceTransformSyntax = (input, sec = state.isProd) => {
			const regex = /\{\{(?<value1>.*?)\|(?<value2>.*?)\}\}/gu;

			return input.replace(regex, (match, value1, value2) =>
				sec ? value2 : value1
			);
		};

		file.contents = Buffer.from(replaceTransformSyntax(String(file.contents)));

		callback(null, file);
	}
});

/**
 * Reload the page when we observe a filechange
 * @returns Hot module reload plugin
 */
const hotReload = () => new Transform({
	objectMode: true,

	transform(file, _enc, callback) {
		if (server) server.changed({ body: { files: [file.path] } });

		callback(null, file);
	}
});

/**
 * Transpile and transform scripts (JavaScript and TypeScript) to work in the browser
 * @returns Gulp end signal
 */
const scripts = () => src(paths.files.script)
	.pipe(changed(state.dest, { extension: '.js' }))
	.pipe(conditionalReplacement())
	.pipe(gulpif(state.isDev, insertHotModuleReload()))
	.pipe(esbuildTransform())
	.pipe(excludeFiles())
	.pipe(dest(state.dest))
	.pipe(hotReload());

/**
 * Parse css and scss.
 *
 * Minifies (strips whitespace, newlines) if it's a production build
 * @returns Gulp end signal
 */
const styles = () => {
	const plugins = [autoprefixer()];

	return src(paths.files.styles)
		.pipe(changed(`${ state.dest }/css`, { extension: '.css' }))
		.pipe(excludeFiles())
		.pipe(sass({
			silenceDeprecations: ['legacy-js-api'],
			outputStyle: state.isProd ? 'compressed' : 'expanded'
		}))
		.pipe(postCSS(plugins))
		.pipe(conditionalReplacement())
		.pipe(dest(`${ state.dest }/css`))
		.pipe(hotReload());
};

/**
 * Preprocess plain html
 * and pipe it to the active folder
 *
 * Minifies (strips whitespace, newlines) if it's a production build
 * @returns Gulp end signal
 */
const html = () => src(paths.files.html)
	.pipe(changed(`${ state.dest }/html`))
	.pipe(conditionalReplacement())
	.pipe(excludeFiles())
	.pipe(gulpif(state.isProd, htmlmin({ collapseWhitespace: true })))
	.pipe(dest(`${ state.dest }/html`))
	.pipe(hotReload());

/**
 * Pipe assets to the active folder
 * @returns Gulp end signal
 */
const assets = () => src(paths.files.assets)
	.pipe(changed(`${ state.dest }/assets`))
	.pipe(excludeFiles())
	.pipe(dest(`${ state.dest }/assets`))
	.pipe(hotReload());

/**
 * Pipe bitmap assets to the active folder
 * @returns Gulp end signal
 */
const bitmap = () => src(paths.files.bitmap)
	.pipe(changed(`${ state.dest }/assets`))
	.pipe(excludeFiles())
	.pipe(gulpif(state.isProd, avif({
		lossless: false,
		quality: 90
	})))
	.pipe(dest(`${ state.dest }/assets`))
	.pipe(hotReload());

/**
 * Pipe meta assets to the active folder
 * @returns Gulp end signal
 */
const meta = () => src(paths.files.meta)
	.pipe(changed(`${ state.dest }/meta`))
	.pipe(excludeFiles())
	.pipe(dest(`${ state.dest }/meta`))
	.pipe(hotReload());

/**
 * Pipe JSON to the active folder
 *
 * Minifies (strips whitespace, newlines) if it's a production build
 * @returns Gulp end signal
 */
const json = () => src(paths.files.json)
	.pipe(changed(state.dest))
	.pipe(excludeFiles())
	.pipe(jeditor(_json => _json, { beautify: !state.isProd }))
	.pipe(dest(state.dest))
	.pipe(hotReload());

/**
 * Transpile and pipe the manifest files to the active folder
 *
 * Minifies (strips whitespace, newlines) if it's a production build
 * @returns Gulp end signal
 */
const manifest = () => src(paths.manifest)
	.pipe(changed(state.dest, { extension: '.json' }))
	.pipe(conditionalReplacement())
	.pipe(excludeFiles())
	.pipe(yaml({ schema: 'DEFAULT_FULL_SCHEMA' }))
	.pipe(jeditor(_json => {
		_json.version = package.version;
		return _json;
	}, { beautify: !state.isProd }))
	.pipe(dest(state.dest))
	.pipe(hotReload());

/**
 * Clean up the target build directory before compiling
 * @returns Gulp end signal
 */
const clean = () => {
	// Before building, clean up the the target folder for all previous files
	if (state.isProd) return del([paths.dist], { force: true });
	return del([paths.build], { force: true });
};

/**
 * Forcefully deletes both build folders
 * @returns Gulp end signal
 */
const destroy = () => del([paths.baseDist, paths.baseBuild], { force: true });

/**
 * Watch files and commit changes.
 *
 * Sends reload signal through LiveReload server.
 */
const watch = () => {
	process.stdout.write(`\x1b[35m# watching the ${paths.mvTarget} build for changes\x1b[0m . . .\n`);

	gulpWatch(paths.files.script, scripts);
	gulpWatch(paths.files.styles, styles);
	gulpWatch(paths.files.html, html);
	gulpWatch(paths.files.assets, assets);
	gulpWatch(paths.files.bitmap, bitmap);
	gulpWatch(paths.files.meta, meta);
	gulpWatch(paths.files.json, json);
	gulpWatch(paths.manifest, manifest);
};

/**
 * Broadcast the process arguments
 */
const broadcast = async() => {
	process.stdout.write(`\x1b[35m# compiling ${state.current} build for ${paths.mvTarget}\x1b[0m . . .\n`);
};

exports.destroy = destroy;
exports.build = series(broadcast, clean, parallel(scripts, styles, html, assets, bitmap, meta, json, manifest));
exports.watch = series(setupLiveReload, exports.build, watch);
exports.default = exports.build;
