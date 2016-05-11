var test = require('tap').test
var custom = require('../lib/custom-factor')
var BundleFactory = require('../lib/bundle-factory')

var ROWS = [
  {
    id: 1,
    file: '/page/a.js',
    deps: { abc: 4 },
  },
  {
    id: 2,
    file: '/page/b.js',
    deps: { abc: 4 },
  },
  {
    id: 3,
    file: '/page/c.js',
    deps: { abc: 4 },
  },
  {
    id: 4,
    file: '/lib/abc.js',
  },
]

test('default', function (t) {
  var factory = createFactory()
  custom().call(factory, ['/page/a.js', '/page/b.js', '/page/c.js'])
  factory.end()

  t.same(factory.getBundles(), ['/page/a.js', '/page/b.js', '/page/c.js'])
  var bm = factory.getBundleMap()
  t.same(
    values(bm['/page/a.js'].modules).sort(),
    ['/lib/abc.js', '/page/a.js']
  )
  t.same(
    values(bm['/page/b.js'].modules).sort(),
    ['/lib/abc.js', '/page/b.js']
  )
  t.same(
    values(bm['/page/c.js'].modules).sort(),
    ['/lib/abc.js', '/page/c.js' ]
  )
  t.end()
})

test('function', function (t) {
  var factory = createFactory()
  custom(function () {
    this.add('bundle.js', this.getModules(), false)
  }).call(factory)
  factory.end()

  t.same(factory.getBundles(), [ 'bundle.js' ])
  var bm = factory.getBundleMap()
  t.same(
    values(bm['bundle.js'].modules).sort(),
    ['/lib/abc.js', '/page/a.js', '/page/b.js', '/page/c.js' ]
  )
  t.end()
})

test('pattern', function (t) {
  var factory = createFactory()
  custom('**/page/*.js').call(factory)
  factory.end()

  t.same(factory.getBundles(), [ '/page/a.js', '/page/b.js', '/page/c.js' ])
  var bm = factory.getBundleMap()
  t.same(
    values(bm['/page/a.js'].modules).sort(),
    ['/lib/abc.js', '/page/a.js' ]
  )
  t.same(
    values(bm['/page/b.js'].modules).sort(),
    ['/lib/abc.js', '/page/b.js' ]
  )
  t.same(
    values(bm['/page/c.js'].modules).sort(),
    ['/lib/abc.js', '/page/c.js' ]
  )
  t.end()
})

test('common', function (t) {
  var factory = createFactory()
  custom({
    groups: '**/page/*.js',
    common: 'common.js',
  }).call(factory)
  factory.end()

  t.same(
    factory.getBundles(),
    [ '/page/a.js', '/page/b.js', '/page/c.js', 'common.js' ]
  )
  var bm = factory.getBundleMap()
  t.same(
    values(bm['/page/a.js'].modules).sort(),
    ['/page/a.js' ]
  )
  t.same(
    values(bm['/page/b.js'].modules).sort(),
    ['/page/b.js' ]
  )
  t.same(
    values(bm['/page/c.js'].modules).sort(),
    ['/page/c.js' ]
  )
  t.same(
    values(bm['common.js'].modules).sort(),
    ['/lib/abc.js' ]
  )
  t.end()
})

function values(s) {
  var res = []
  s.forEach(function (v) {
    res.push(v)
  })
  return res
}

function createFactory() {
  var factory = new BundleFactory()
  ROWS.forEach(function (row) {
    factory.addModule(row)
  })
  factory.start()
  return factory
}

