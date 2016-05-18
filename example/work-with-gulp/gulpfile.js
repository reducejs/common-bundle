var gulp = require('gulp')
var browserify = require('browserify')
var del = require('del')
var glob = require('globby')
var path = require('path')

gulp.task('build', function () {
  del.sync('build')
  return createBundler().bundle().pipe(gulp.dest('build'))
})

gulp.task('watch', function (cb) {
  var b = createBundler()
    .plugin('watchify2', { entryGlob: 'page/**/index.js' })
    .on('close', cb)
    .on('update', bundle)
  function bundle() {
    del.sync('build')
    b.bundle().pipe(gulp.dest('build'))
  }
  bundle()
})

function createBundler() {
  var basedir = path.resolve(__dirname, 'src')
  var entries = glob.sync('page/**/index.js', { cwd: basedir })
  var b = browserify(entries, { basedir: basedir })
  b.plugin('common-bundle', {
    factor: {
      groups: 'page/**/index.js',
      common: 'common.js',
    },
  })
  b.on('common.map', function (o) {
    console.log(
      'bundles:', Object.keys(o.bundles).length,
      'modules:', Object.keys(o.modules).length,
      'entries:', Object.keys(o.entries).length
    )
  })
  return b
}

