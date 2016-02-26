'use strict'

const test = require('tap').test
const browserify = require('browserify')
const vfs = require('vinyl-fs')
const del = require('del')
const run = require('callback-sequence').run
const commonify = require('..')
const path = require('path')
const fixtures = path.resolve.bind(path, __dirname, 'fixtures')
const build = fixtures('build')
const fs = require('fs')

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

