var fs = require('fs')
var del = require('del')
var path = require('path')
var commonify = require('..')
var vfs = require('vinyl-fs')
var test = require('tap').test
var browserify = require('browserify')
var run = require('callback-sequence').run
var fixtures = path.resolve.bind(path, __dirname, 'fixtures')
var build = fixtures('build')

test('multiple', function(t) {
  return run([
    function () {
      return del(build)
    },
    function () {
      return browserify(['./a.js', './b.js'], { basedir: fixtures('src') })
        .plugin(commonify, {
          groups: '+(a|b).js',
          common: 'common.js',
        })
        .bundle()
        .pipe(vfs.dest(build))
    },
    function () {
      t.equal(
        read(fixtures('build', 'a.js')),
        read(fixtures('expected', 'multiple', 'a.js')),
        'a.js'
      )
      t.equal(
        read(fixtures('build', 'b.js')),
        read(fixtures('expected', 'multiple', 'b.js')),
        'b.js'
      )
      t.equal(
        read(fixtures('build', 'common.js')),
        read(fixtures('expected', 'multiple', 'common.js')),
        'common.js'
      )
      t.end()
    },
  ])
})

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

