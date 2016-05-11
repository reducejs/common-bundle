var path = require('path')
var commonify = require('..')
var test = require('tap').test
var browserify = require('browserify')
var fixtures = path.resolve.bind(path, __dirname, 'fixtures', 'src')

test('map', function(t) {
  var b = browserify(['./a.js', './b.js'], { basedir: fixtures() })
  b.plugin(commonify, {
    factor: {
      groups: ['a.js', 'b.js'],
      common: 'common.js',
    },
  })
  b.on('common.map', function (bundleMap, inputMap, fileMap) {
    var idMap = flip(fileMap)
    var toID = function (file) {
      return idMap[file]
    }
    t.same(bundleMap, {
      'a.js': {
        modules: ['a.js'].map(toID),
        deps: ['common.js'],
      },
      'b.js': {
        modules: ['b.js'].map(toID),
        deps: ['common.js'],
      },
      'common.js': {
        modules: ['c.js'].map(toID),
        deps: [],
      },
    })

    t.same(inputMap, {
      'a.js': ['common.js', 'a.js'],
      'b.js': ['common.js', 'b.js'],
    })

    t.end()
  })
  b.bundle()
})

function flip(o) {
  var res = {}
  for (var k in o) {
    res[o[k]] = k
  }
  return res
}

