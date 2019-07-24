const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const cssnano = require('gulp-cssnano');
const fs = require('fs');
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const gutil = require('gulp-util');
const header = require('gulp-header');
const htmlmin = require('gulp-htmlmin');
const process = require('process');
const replace = require('gulp-replace');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');

const ENV = process.env.ENV || 'dev';

let ASSET_PATH = '/dist/assets';

if (ENV === 'production') {
  ASSET_PATH = '/assets';
}

gulp.task('markup', ['styles'], () => {
  return gulp.src('markup/**/*.html')
    .pipe(replace('{{inline-css}}', (...args) => {
      return `
        <style type="text/css">
          ${fs.readFileSync('dist/assets/styles/app.css', 'utf-8')}
        </style>
      `;
    }))
    .pipe(replace(/{{([a-z]+)\s+?([a-z]+=".*")}}/gi, (...args) => {
      const [match, type, rawAttrs, position] = args;
      const attrs = rawAttrs.split(' ').reduce((acc, attr) => {
        const [key, value] = attr.split('=');
        acc[key] = value.replace(/\"/gi, '');
        return acc;
      }, {});

      switch(type) {
        case 'assetpath':
          return ASSET_PATH;
          break;

        case 'asset':
          const package = require('./package.json');
          const cacheBust = `?version=${package.version}`;

          switch(attrs.type) {
            case 'style':
              return `${ASSET_PATH}/styles/app.css${cacheBust}`;
              break;

            case 'script':
              return `${ASSET_PATH}/scripts/app.js${cacheBust}`;
              break;

            case 'image':
              return `${ASSET_PATH}/images/${attrs.name}${cacheBust}`;
          }
          break;
      }

      return '';
    }))
    .pipe(gulpIf(ENV === 'production', htmlmin()))
    .pipe(gulp.dest('dist/'));
});

gulp.task('styles', () => {
  const vars = `
      $font-path: "${ASSET_PATH}/fonts/";
  `;

  return gulp.src([
    'assets/styles/app.scss',
  ])
      .pipe(header(vars))
      .pipe(sass().on('error', sass.logError))
      .pipe(gulpIf(ENV !== 'production', sourcemaps.init()))
      .pipe(autoprefixer({
          browsers: [
            'Android >= 4.4',
            'last 2 versions',
            'last 4 iOS versions',
          ],
      }))
      .pipe(gulpIf(ENV === 'production', cssnano()))
      .pipe(gulpIf(ENV !== 'production', sourcemaps.write()))
      .pipe(concat('app.css'))
      .pipe(gulp.dest('dist/assets/styles/'));
});

gulp.task('images', () => {
  return gulp.src([
    'assets/images/**/*',
  ]).pipe(gulp.dest('dist/assets/images/'));
});

gulp.task('watch', ['build',], () => {
  gulp.watch('assets/styles/**/*', ['markup']);
  gulp.watch([
    'markup/**/*.html',
  ], ['markup']);
});

gulp.task('build', [
  'images',
  'markup',
]);
