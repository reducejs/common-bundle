var path = require('path')
var commonify = require('..')
var test = require('tap').test
var browserify = require('browserify')
var fixtures = path.resolve.bind(path, __dirname, 'fixtures', 'src')

test('map', function(t) {
  var b = browserify(['./a.js', './b.js'], { basedir: fixtures() })
  b.plugin(commonify, {
    groups: ['a.js', 'b.js'],
    common: 'common.js',
  })
  b.on('common.map', function (o) {
    var bundles = o.bundles
    var inputs = o.entries
    var modules = o.modules
    var basedir = o.basedir

    var expectedModules = {
      'a.js': [ ['common.js', 'a.js'] ],
      'b.js': [ ['common.js', 'b.js'] ],
      'c.js': [ ['common.js'] ],
    }
    var file2idMap = {}
    for (var id in modules) {
      t.same(modules[id].bundles, expectedModules[modules[id].file])
      file2idMap[modules[id].file] = id
    }

    function file2id(file) {
      return file2idMap[file]
    }

    t.same(bundles, {
      'a.js': {
        modules: ['a.js'].map(file2id),
        deps: ['common.js'],
      },
      'b.js': {
        modules: ['b.js'].map(file2id),
        deps: ['common.js'],
      },
      'common.js': {
        modules: ['c.js'].map(file2id),
        deps: [],
      },
    })

    t.same(inputs, ['a.js', 'b.js'].map(file2id))
    t.same(basedir, fixtures())
    t.end()
  })
  b.bundle()
})

