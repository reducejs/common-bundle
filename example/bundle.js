var browserify = require('browserify')
var vfs = require('vinyl-fs')
var del = require('del')
var glob = require('glob')
var path = require('path')

var basedir = path.resolve(__dirname, 'src')
var entries = glob.sync('page/**/index.js', { cwd: basedir })

var b = browserify(entries, { basedir: basedir })

b.plugin(require('..'), {
  groups: '**/page/**/index.js',
  common: [
    {
      output: 'color.js',
      filter: ['page/red/index.js', 'page/green/index.js'],
    },
    {
      output: 'say.js',
      filter: ['page/hi/index.js', 'page/hello/index.js'],
    },
  ],
})

var build = path.resolve(__dirname, 'build')
del.sync(build)
b.bundle().pipe(vfs.dest(build))

