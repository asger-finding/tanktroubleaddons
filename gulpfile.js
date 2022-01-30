const { src, dest, task, watch: _watch, series, parallel } = require('gulp');
const yargs        = require('yargs');
const package      = require('./package.json');
const del          = require('del');
const changed      = require('gulp-changed');
const rename       = require('gulp-rename');
const gulpif       = require('gulp-if');
const ts           = require('gulp-typescript');
const terser       = require('gulp-terser');
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
    manifest: `${ origin }/manifest*.yml`,
    redundancy: 'DELETEME',
    files: {
        script: `${ origin }/**/*.@(js|ts)`,
        css :   `${ origin }/css/*.@(css|scss)`,
        html:   `${ origin }/html/*.html`,
        images: `${ origin }/assets/@(images|svg)/*.@(png|jpg|jpeg|gif|svg)`,
        json:   `${ origin }/**/*.json`,
        yaml:    `${ origin }/**/!(manifest)*.yml`
    },
    baseBuild: './build',
    baseDist: './dist',
    build: './build',
    dist: './dist',
    set target(target) {
        this.browserTarget = target;
        this.build = `${ this.baseBuild }/${ target }`;
        this.dist = `${ this.baseDist }/${ target }`;
    },
    get redudancies() {
        return [
            `${ this.build }/**/${ this.redundancy }.*`,
            `${ this.dist }/**/${ this.redundancy }.*`
        ]
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
    get prod() {
		return this.current === this.PRODUCTION;
    },
	get dest() {
		return this.prod ? paths.dist : paths.build;
	}
}
const tsProject = ts.createProject('./tsconfig.json');
paths.target = yargs.argv.target || 'chromium';

function browserSpecificFiles(filename) {
    const browsers = filename.split('_');
    const name = browsers.shift();

    const callback = {
        basename: (browsers.includes(paths.browserTarget) || browsers.length === 0) ? name : paths.redundancy,
        browsers: browsers
    }
    callback.use = !(callback.filename === paths.redundancy);
    return callback;
}

function scripts() {
    return src(paths.files.script)
        .pipe(changed(state.dest))
        .pipe(rename(path => (path.basename = browserSpecificFiles(path.basename).basename, path) ))
        .pipe(tsProject())
        .pipe(gulpif(state.prod, terser()))
        .pipe(dest(state.dest));
}

function css() {
    const plugins = [
        autoprefixer(),
        ... state.prod ? [
            cssnano()
        ] : []
    ]
    return src(paths.files.css)
        .pipe(changed(state.dest + '/css'))
        .pipe(rename(path => (path.basename = browserSpecificFiles(path.basename).basename, path) ))
        .pipe(sass())
        .pipe(postCSS(plugins))
        .pipe(dest(state.dest + '/css'));
}

function html() {
    return src(paths.files.html)
        .pipe(changed(state.dest))
        .pipe(rename(path => (path.basename = browserSpecificFiles(path.basename).basename, path) ))
        .pipe(gulpif(state.prod, htmlmin({ collapseWhitespace: true })))
	    .pipe(dest(state.dest));
}

function images() {
    return src(paths.files.images)
        .pipe(changed(state.dest + '/assets'))
        .pipe(rename(path => (path.basename = browserSpecificFiles(path.basename).basename, path) ))
        .pipe(gulpif(state.prod, imagemin()))
	    .pipe(dest(state.dest + '/assets'));
}

function json() {
    return src(paths.files.json)
        .pipe(changed(state.dest))
        .pipe(rename(path => (path.basename = browserSpecificFiles(path.basename).basename, path) ))
		.pipe(jeditor(json => {return json}, { beautify: !state.prod }))
        .pipe(dest(state.dest));
}

function manifest() {
    return src(paths.manifest)
        .pipe(changed(state.dest))
        .pipe(rename(path => (path.basename = browserSpecificFiles(path.basename).basename, path) ))
        .pipe(yaml({ schema: 'DEFAULT_FULL_SCHEMA' }))
        .pipe(jeditor(json => {
            json.version = package.version;
            return json;
        }, { beautify: !state.prod } ))
        .pipe(dest(state.dest));
}

function removeRedundancies() {
    return del(paths.redudancies, { force: true });
}

function clean() {
    return del([ paths.dist, paths.build ], { force: true });
}

function annihilation() {
    return del([ paths.baseDist, paths.baseBuild ], { force: true });
}

function watch() {
    console.log('\x1b[35m%s\x1b[0m', `Now watching the ${ paths.browserTarget } build!`);

    _watch(paths.files.script, series(scripts, removeRedundancies));
    _watch(paths.files.css, series(css, removeRedundancies));
    _watch(paths.files.html, series(html, removeRedundancies));
    _watch(paths.files.images, series(images, removeRedundancies));
    _watch(paths.files.json, series(json, removeRedundancies));
    _watch(paths.manifest, series(manifest, removeRedundancies));
}

async function announce() {
    console.log('\x1b[35m%s\x1b[0m', `Compiling ${ state.current } version for ${ paths.browserTarget }`);
    return;
}

exports.annihilation = task('annihilation', annihilation);;
exports.build = task('build', series(announce, clean, parallel(scripts, css, html, images, json, manifest), removeRedundancies));
exports.watch = task('watch', series('build', watch));
exports.default = series('build');
