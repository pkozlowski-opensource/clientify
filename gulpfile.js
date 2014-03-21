var gulp = require('gulp');
var gutil = require('gulp-util');
var mocha = require('gulp-mocha');

gulp.task('default', function () {
  gulp.src('test/algorithm.spec.js', { read: false })
    .pipe(mocha())
    .on('error', gutil.log);
});

gulp.task('watch', function () {
  gulp.watch(['lib/*.js', 'test/*.spec.js'], ['default']);
});