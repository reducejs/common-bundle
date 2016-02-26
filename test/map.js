'use strict'

const del = require('del')
const path = require('path')
const commonify = require('..')
const test = require('tap').test
const browserify = require('browserify')

const fixtures = path.resolve.bind(path, __dirname, 'fixtures')
const build = fixtures('build')

test('map', function(t) {
  del(build).then(function () {
    let b = browserify(['./a.js', './b.js'], { basedir: fixtures('src') })
    b.plugin(commonify, {
      groups: ['a.js', 'b.js'],
      common: {
        filter: ['a.js', 'b.js'],
        output: 'common.js',
      },
    })
    b.on('common.map', function (map) {
      t.same(map, {
        'a.js': {
          modules: ['a.js'],
          deps: ['common.js'],
        },
        'b.js': {
          modules: ['b.js'],
          deps: ['common.js'],
        },
        'common.js': {
          modules: ['c.js'],
        },
      })

      t.end()
    })
    b.bundle()
  })
})

