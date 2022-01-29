const { src, dest, task, watch: _watch, series, parallel } = require('gulp');
const { TargetManager } = require('./utils/CompilationManagers.js');
const yargs        = require('yargs');
const package      = require('./package.json');
const del          = require('del');
const changed      = require('gulp-changed');
const ignore       = require('gulp-ignore');
const rename       = require('gulp-rename');
const ts           = require('gulp-typescript');
const terser       = require('gulp-terser');
const sourcemaps   = require('gulp-sourcemaps');
const postCSS      = require('gulp-postcss');
const sass         = require('gulp-sass')(require('sass'));
const autoprefixer = require('autoprefixer');
const cssnano      = require('cssnano');
const htmlmin      = require('gulp-htmlmin');
const imagemin     = require('gulp-imagemin');
const jeditor      = require('gulp-json-editor');
const yaml         = require('gulp-yaml');

const origin    = './src';
const paths = {
    manifest_chromium: `${ origin }/manifest_chromium.yml`,
    manifest_firefox: `${ origin }/manifest_firefox.yml`,
    files: {
        script: `${ origin }/**/*.@(js|ts)`,
        css :   `${ origin }/css/*.@(css|scss)`,
        html:   `${ origin }/html/*.html`,
        images: `${ origin }/assets/@(images|svg)/*.@(png|jpg|jpeg|gif|svg)`,
        json:   `${ origin }/**/*.json`
    },
    baseBuild: './build',
    baseDist: './dist',
    build: './build',
    dist: './dist',
    browserTarget: 'chromium',
    set target(tar) {
        this.browserTarget = tar;
        this.build = `${ paths.baseBuild }/${ tar }`;
        this.dist = `${ paths.baseDist }/${ tar }`;
    }
}
const state = {
    DEV:        'development',
    WATCH:      'watch',
    PRODUCTION: 'production',
	DEFAULT:    'default',
    get current() {
        return yargs.argv.state || this[this.DEFAULT];
    },
    get rel() {
		return this.current === this.PRODUCTION;
    },
	get dest() {
		return this.rel ? paths.dist : paths.build;
	}
}
const tsProject = ts.createProject('./tsconfig.json');

function scripts() {
    const source = src(paths.files.script)
        .pipe(changed(state.dest))
        .pipe(tsProject());
        state.rel && source.pipe(sourcemaps.init())
            .pipe(terser())
            .pipe(sourcemaps.write('.'));
    return source.pipe(dest(state.dest));
}

function css() {
    const plugins = [
        autoprefixer(),
        ... state.rel ? [
            cssnano()
        ] : []
    ]
    return src(paths.files.css)
        .pipe(changed(state.dest + '/css'))
        .pipe(sass())
        .pipe(postCSS(plugins))
        .pipe(dest(state.dest + '/css'));
}

function html() {
    const source = src(paths.files.html)
        .pipe(changed(state.dest));
        state.rel && source.pipe(htmlmin({ collapseWhitespace: true }))
	return source.pipe(dest(state.dest));
}

function images() {
    const source = src(paths.files.images)
        .pipe(changed(state.dest + '/assets'));
        state.rel && source.pipe(imagemin());
	return source.pipe(dest(state.dest + '/assets'));	
}

function json() {
    return src(paths.files.json)
        .pipe(changed(state.dest))
		.pipe(jeditor(json => {return json}, { beautify: !state.rel }))
        .pipe(dest(state.dest));
}

function manifest() {
    return src(paths.manifest_chromium)
        .pipe(changed(state.dest))
        .pipe(yaml({ schema: 'DEFAULT_FULL_SCHEMA' }))
        .pipe(jeditor(json => {
            json.version = package.version;
            return json;
        }, { beautify: !state.rel } ))
        .pipe(rename('manifest.json'))
        .pipe(dest(state.dest));
}

function clean() {
    return del([ paths.dist, paths.build ], { force: true });
}

function watch() {
    _watch(paths.files.script, scripts);
    _watch(paths.files.css, css);
    _watch(paths.files.html, html);
    _watch(paths.files.images, images);
    _watch(paths.files.json, json);
}

/*
async function compileForBrowsers() {
    await clean();
    
    const browsers = yargs.argv.target.split(' ');
    for (const index in browsers) {
        paths.target = browsers[index];
        await build();
    }
}
*/

async function build() {
    return await series(clean, parallel(scripts, css, html, images, json, manifest))();
}

exports.clean = task('clean', clean);;
exports.build = task('build', build);
exports.watch = task('watch', series('clean', 'build', watch));
exports.default = series('clean', 'build');
