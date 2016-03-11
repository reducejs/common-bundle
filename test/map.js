var path = require('path')
var commonify = require('..')
var test = require('tap').test
var browserify = require('browserify')
var fixtures = path.resolve.bind(path, __dirname, 'fixtures', 'src')

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

    t.same(inputMap[fixtures('a.js')], ['common.js', 'a.js'])
    t.same(inputMap[fixtures('b.js')], ['common.js', 'b.js'])

    t.end()
  })
  b.bundle()
})

