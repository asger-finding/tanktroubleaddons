const { src, dest, task, watch, series} = require('gulp');
const argv         = require('yargs').argv;
const filesystem   = require('fs');
const package      = require('./package.json');
const del          = require('del');
const changed      = require('gulp-changed');
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
const jsoneditor   = require('gulp-json-editor');

const tsProject = ts.createProject('./tsconfig.json');
const origin = './src';
const build = './build';
const dist = './dist';
const paths = {
    manifest: `${origin}/manifest.json`,
    files: {
        js: `${origin}/**/*.@(js|ts)`, //`${origin}/*/{*.@(js|ts),!(injects)/**/*.@(js|ts)}`,
        css : `${origin}/css/*.@(css|scss)`,
        html: `${origin}/html/*.html`,
        images: `${origin}/assets/@(images|svg)/*.@(png|jpg|jpeg|gif|svg)`,
        json: `${origin}/**/*.json`,
        //injects: `${origin}/js/injects/**/*.js`
    }
}
const states = {
    DEFAULT: 'default',
    DEV: 'dev',
    DEBUG: 'debug',
    RELEASE: 'release',
    get current() {
        return argv.state || this[this.DEFAULT];
    },
    get rel() {
        return this.current === this.RELEASE;
    },
	get dest() {
		return this.rel ? dist : build;
	}
}

function scripts() {
    let source = src(paths.files.js)
        .pipe(changed(states.dest))
        .pipe(tsProject());
        states.rel && source.pipe(sourcemaps.init())
            .pipe(terser())
            .pipe(sourcemaps.write('.'));
    return source.pipe(dest(states.dest));
}

function css() {
    const devPlugins = [
        autoprefixer()
    ];
    const releasePlugins = [
        ...devPlugins,
        cssnano()
    ];
    return src(paths.files.css)
        .pipe(changed(states.dest))
        .pipe(sass())
        .pipe(postCSS(states.rel ? releasePlugins : devPlugins))
        .pipe(dest(states.dest + '/css'));
}

function html() {
    const source= src(paths.files.html)
        .pipe(changed(states.dest));
        states.rel && source.pipe(htmlmin({ collapseWhitespace: true }))
	return source.pipe(dest(states.dest));
}

function images() {
    const source = src(paths.files.images)
        .pipe(changed(states.dest));
        states.rel && source.pipe(imagemin());
	return source.pipe(dest(states.dest + '/assets'));	
}

function json() {
    return src(paths.files.json)
        .pipe(changed(states.dest))
        .pipe(dest(states.dest));
}

function manifest() {
    return src(paths.manifest)
        .pipe(changed(states.dest))
        .pipe(jsoneditor(function(json) {
            json.version = package.version;
            return json;
        }))
        .pipe(dest(states.dest));       
}

function clean() {
    return del([ dist, build ], { force: true });
}

task('clean', clean);
task('build', series(scripts, css, html, images, json, manifest));
task('watch', series('clean', 'build', function() {
    watch(paths.files.js, scripts);
    watch(paths.files.css, css);
    watch(paths.files.html, html);
    watch(paths.files.images, images);
    watch(paths.files.json, json);
}));
exports.clean = task('clean');
exports.default = series(exports.clean, 'build');