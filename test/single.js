var test = require('tap').test
var browserify = require('browserify')
var vfs = require('vinyl-fs')
var del = require('del')
var run = require('callback-sequence').run
var commonify = require('..')

var path = require('path')
var fixtures = path.resolve.bind(path, __dirname, 'fixtures')
var build = fixtures('build')
var fs = require('fs')

test('single', function(t) {
  return run([
    function () {
      return del(build)
    },
    function () {
      return browserify(['./a.js', './b.js'], { basedir: fixtures('src') })
        .plugin(commonify, {
          groups: { output: 'bundle.js' },
        })
        .bundle()
        .pipe(vfs.dest(build))
    },
    function () {
      t.equal(
        read(fixtures('build', 'bundle.js')),
        read(fixtures('expected', 'single', 'bundle.js'))
      )
      t.end()
    },
  ])
})

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

