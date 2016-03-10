'use strict'

const path = require('path')
const commonify = require('..')
const test = require('tap').test
const browserify = require('browserify')

const fixtures = path.resolve.bind(path, __dirname, 'fixtures', 'src')

test('map', function(t) {
  var b = browserify(['./a.js', './b.js'], { basedir: fixtures() })
  b.plugin(commonify, {
    groups: ['a.js', 'b.js'],
    common: {
      filter: ['a.js', 'b.js'],
      output: 'common.js',
    },
  })
  b.on('common.map', function (bundleMap, inputMap) {
    t.same(bundleMap, {
      'a.js': {
        modules: [fixtures('a.js')],
        deps: ['common.js'],
      },
      'b.js': {
        modules: [fixtures('b.js')],
        deps: ['common.js'],
      },
      'common.js': {
        modules: [fixtures('c.js')],
      },
    })

    t.same(inputMap, {
      [fixtures('a.js')]: ['common.js', 'a.js'],
      [fixtures('b.js')]: ['common.js', 'b.js'],
    })

    t.end()
  })
  b.bundle()
})

