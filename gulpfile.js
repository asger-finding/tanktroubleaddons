const { src, dest, task, watch, series} = require('gulp');
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
        js: `${origin}/*/{*.@(js|ts),!(injects)/**/*.@(js|ts)}`,
        css : `${origin}/css/*.@(css|scss)`,
        html: `${origin}/html/*.html`,
        images: `${origin}/images/@(images|svg)/*.@(png|jpg|jpeg|gif|svg)`,
        json: `${origin}/json/[!manifest]*.json`,
        injects: `${origin}/js/injects/*.js`
    }
}

function scripts() {
    return src([ paths.files.js, paths.files.injects ])
        .pipe(changed(dist))
        .pipe(sourcemaps.init())
            .pipe(tsProject())
            .pipe(terser())
        .pipe(sourcemaps.write('.'))
        .pipe(dest(dist));
}

function css() {
    const plugins = [
        autoprefixer(),
        cssnano()
    ];
    return src(paths.files.css)
        .pipe(changed(dist))
        .pipe(sass())
        .pipe(postCSS(plugins))
        .pipe(dest(dist));

}

task('clean', function() {
    return del([ dist, build ], { force: true });
});
task('build', series(scripts, css));
task('default', series('clean', 'build'));