var gulp = require('gulp');
var mocha = require('gulp-mocha');

gulp.task('default', function () {
  gulp.src('test/*.spec.js').pipe(mocha());
});

gulp.task('watch', function () {
  gulp.watch(['lib/*.js', 'test/*.spec.js'], ['default']);
});