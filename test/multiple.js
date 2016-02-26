'use strict'

const fs = require('fs')
const del = require('del')
const path = require('path')
const commonify = require('..')
const vfs = require('vinyl-fs')
const test = require('tap').test
const browserify = require('browserify')
const run = require('callback-sequence').run

const fixtures = path.resolve.bind(path, __dirname, 'fixtures')
const build = fixtures('build')

test('multiple', function(t) {
  return run([
    function () {
      return del(build)
    },
    function () {
      return browserify(['./a.js', './b.js'], { basedir: fixtures('src') })
        .plugin(commonify, {
          groups: ['a.js', 'b.js'],
          common: {
            filter: ['a.js', 'b.js'],
            output: 'common.js',
          },
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

