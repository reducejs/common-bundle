var browserify = require('browserify')
var vfs = require('vinyl-fs')
var del = require('del')
var path = require('path')
var basedir = path.resolve(__dirname, 'src')
var glob = require('globby')
var entries = glob.sync('entry*.js', { cwd: basedir })
var b = browserify(entries, {
  basedir: basedir,
  cache: {},
  packageCache: {},
})

b.plugin('common-bundle', {
  factor: {
    groups: 'entry*.js',
    common: 'common.js',
  },
})

b.plugin('watchify2', { entryGlob: 'entry*.js' })

function bundle() {
  var build = path.resolve(__dirname, 'build')
  del.sync(build)
  b.bundle().pipe(vfs.dest(build))
}

b.on('update', bundle)

b.on('common.map', function (o) {
  console.log(
    'bundles:', Object.keys(o.bundles).length,
    'modules:', Object.keys(o.modules).length,
    'entries:', Object.keys(o.entries).length
  )
})

bundle()

