var test = require('tap').test
var BundleFactory = require('../lib/bundle-factory')

var ROWS = {
  a: {
    id: 1,
    file: '/page/a.js',
    deps: { b: 2, c: 3 },
  },

  b: {
    id: 2,
    file: '/page/b.js',
    deps: { d: 4 },
  },
  c: {
    id: 3,
    file: '/page/c.js',
    deps: { e: 5, f: 6 },
  },

  d: {
    id: 4,
    file: '/page/d.js',
    deps: { g: 7 },
  },
  e: {
    id: 5,
    file: '/page/e.js',
    deps: { h: 8 },
  },
  f: {
    id: 6,
    file: '/page/f.js',
    deps: { i: 9, j: 10 },
  },

  g: {
    id: 7,
    file: '/lib/g.js',
    deps: {},
  },
  h: {
    id: 8,
    file: '/lib/h.js',
    deps: {},
  },
  i: {
    id: 9,
    file: '/lib/i.js',
    deps: {},
  },
  j: {
    id: 10,
    file: '/lib/j.js',
    deps: {},
  },
}

var EXTRA_ROWS = [
  {
    id: 1,
    file: '/page/a.js',
    deps: { ab: 4, ac: 5 },
  },
  {
    id: 2,
    file: '/page/b.js',
    deps: { ab: 4, bc: 6 },
  },
  {
    id: 3,
    file: '/page/c.js',
    deps: { ac: 5, bc: 6 },
  },
  {
    id: 4,
    file: '/lib/ab.js',
    deps: { abc: 7 },
  },
  {
    id: 5,
    file: '/lib/ac.js',
    deps: { abc: 7 },
  },
  {
    id: 6,
    file: '/lib/bc.js',
    deps: { abc: 7 },
  },
  {
    id: 7,
    file: '/lib/abc.js',
  },
]

test('add', function (tt) {
  tt.test('single tree', function (t) {
    var factory = new BundleFactory()
    ;['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].forEach(function (i) {
      factory.addModule(ROWS[i])
    })

    factory.start()
    factory.add('bundle.js', '/page/a.js')
    factory.end()
    var bundleMap = factory.getBundleMap()
    t.same(factory.getBundles(), [ 'bundle.js' ])
    t.same(bundleMap['bundle.js'].deps, [])
    t.same(
      values(bundleMap['bundle.js'].modules).sort(),
      [
        '/lib/g.js',
        '/lib/h.js',
        '/lib/i.js',
        '/lib/j.js',
        '/page/a.js',
        '/page/b.js',
        '/page/c.js',
        '/page/d.js',
        '/page/e.js',
        '/page/f.js',
      ]
    )
    t.end()
  })

  tt.test('forest', function (t) {
    var factory = new BundleFactory()
    ;['d', 'e', 'f', 'g', 'h', 'i', 'j'].forEach(function (i) {
      factory.addModule(ROWS[i])
    })

    factory.start()
    factory.add('e.js', '/page/e.js')
    factory.add('f.js', '/page/f.js')
    factory.end()

    var bundleMap = factory.getBundleMap()
    t.same(factory.getBundles(), [ 'e.js', 'f.js' ])
    t.same(bundleMap['e.js'].deps, [])
    t.same(bundleMap['f.js'].deps, [])
    t.same(
      values(bundleMap['e.js'].modules).sort(),
      [
        '/lib/g.js',
        '/lib/h.js',
        '/page/d.js',
        '/page/e.js',
      ]
    )
    t.same(
      values(bundleMap['f.js'].modules).sort(),
      [
        '/lib/g.js',
        '/lib/i.js',
        '/lib/j.js',
        '/page/d.js',
        '/page/f.js',
      ]
    )

    t.end()
  })

  tt.test('append', function (t) {
    var factory = new BundleFactory()
    ;['d', 'e', 'f', 'g', 'h', 'i', 'j'].forEach(function (i) {
      factory.addModule(ROWS[i])
    })

    factory.start()
    factory.add('e.js', '/page/e.js')
    factory.add('f.js', '/page/f.js')
    factory.add('e.js', '/page/d.js')
    factory.end()

    var bundleMap = factory.getBundleMap()
    t.same(factory.getBundles(), [ 'e.js', 'f.js' ])
    t.same(bundleMap['e.js'].deps, [])
    t.same(bundleMap['f.js'].deps, [])
    t.same(
      values(bundleMap['e.js'].modules).sort(),
      [
        '/lib/g.js',
        '/lib/h.js',
        '/page/d.js',
        '/page/e.js',
      ]
    )
    t.same(
      values(bundleMap['f.js'].modules).sort(),
      [
        '/lib/i.js',
        '/lib/j.js',
        '/page/f.js',
      ]
    )

    t.end()
  })

  tt.end()
})

test('select', function (t) {
  var factory = new BundleFactory()
  EXTRA_ROWS.forEach(function (row) {
    factory.addModule(row)
  })

  factory.start()
  factory.add('a.js', '/page/a.js')
  factory.add('b.js', '/page/b.js')
  factory.add('c.js', '/page/c.js')

  t.same(
    factory.select('*.js', true),
    [ '/lib/abc.js' ]
  )
  t.same(
    factory.select(['a.js', 'b.js']).sort(),
    [ '/lib/ab.js', '/lib/abc.js' ]
  )
  t.same(
    factory.select('*.js', 1, true).sort(),
    [ '/lib/ab.js', '/lib/abc.js', '/lib/ac.js', '/lib/bc.js' ]
  )
  t.same(
    factory.select('*.js', 2, true).sort(),
    [ '/lib/abc.js' ]
  )
  t.same(
    factory.select('*.js', function (row, groups) {
      return groups.length > 1 && groups.length < 3
    }, true).sort(),
    [ '/lib/ab.js', '/lib/ac.js', '/lib/bc.js' ]
  )
  t.end()
})

test('dedupe', function (tt) {
  tt.test('simple', function (t) {
    var factory = new BundleFactory()
    EXTRA_ROWS.forEach(function (row) {
      factory.addModule(row)
    })

    factory.start()
    factory.add('a.js', '/page/a.js')
    factory.add('b.js', '/page/b.js')
    factory.add('c.js', '/page/c.js')
    factory.add('common.js', factory.select(['a.js', 'c.js', 'b.js'], false))
    factory.dedupe('common.js', '*.js', true)
    factory.end()

    var bundleMap = factory.getBundleMap()
    t.same(
      factory.getBundles(), ['a.js', 'b.js', 'c.js', 'common.js']
    )
    t.same(bundleMap['a.js'].deps, ['common.js'])
    t.same(
      values(bundleMap['a.js'].modules).sort(),
      ['/lib/ab.js', '/lib/ac.js', '/page/a.js']
    )
    t.same(bundleMap['b.js'].deps, ['common.js'])
    t.same(
      values(bundleMap['b.js'].modules).sort(),
      ['/lib/ab.js', '/lib/bc.js', '/page/b.js']
    )
    t.same(bundleMap['c.js'].deps, ['common.js'])
    t.same(
      values(bundleMap['c.js'].modules).sort(),
      ['/lib/ac.js', '/lib/bc.js', '/page/c.js']
    )
    t.same(bundleMap['common.js'].deps, [])
    t.same(
      values(bundleMap['common.js'].modules),
      ['/lib/abc.js']
    )
    t.end()
  })

  tt.test('dedupe bundles with dependents', function (t) {
    var factory = new BundleFactory()
    factory.addModule({
      id: 1,
      file: '/page/a.js',
      deps: { b: 2, e: 5 },
    })
    factory.addModule({
      id: 2,
      file: '/page/b.js',
      deps: { c: 3 },
    })
    factory.addModule({
      id: 3,
      file: '/page/c.js',
      deps: {},
    })
    factory.addModule({
      id: 4,
      file: '/page/d.js',
      deps: { b: 2, e: 5 },
    })
    factory.addModule({
      id: 5,
      file: '/page/e.js',
      deps: {},
    })

    factory.start()
    factory.add('a.js', '/page/a.js')
    factory.add('d.js', '/page/d.js')
    factory.add('c.js', factory.select(['a.js', 'd.js'], false))
    factory.dedupe('c.js', ['a.js', 'd.js'], false)
    factory.add('cc.js', ['/page/b.js'])
    factory.dedupe('cc.js', 'c.js', false)
    factory.end()

    var bundleMap = factory.getBundleMap()
    t.same(
      factory.getBundles(), ['a.js', 'd.js', 'c.js', 'cc.js']
    )
    t.same(bundleMap['a.js'].deps, ['cc.js', 'c.js'])
    t.same(
      values(bundleMap['a.js'].modules).sort(),
      ['/page/a.js']
    )
    t.same(bundleMap['d.js'].deps, ['cc.js', 'c.js'])
    t.same(
      values(bundleMap['d.js'].modules).sort(),
      ['/page/d.js']
    )
    t.same(bundleMap['c.js'].deps, ['cc.js'])
    t.same(
      values(bundleMap['c.js'].modules).sort(),
      ['/page/e.js']
    )
    t.same(bundleMap['cc.js'].deps, [])
    t.same(
      values(bundleMap['cc.js'].modules).sort(),
      ['/page/b.js', '/page/c.js']
    )
    t.end()
  })

  tt.end()
})

test('addCommon', function (t) {
  var factory = new BundleFactory()
  EXTRA_ROWS.forEach(function (row) {
    factory.addModule(row)
  })

  factory.start()
  factory.add('a.js', '/page/a.js')
  factory.add('b.js', '/page/b.js')
  factory.add('c.js', '/page/c.js')
  factory.addCommon('ab.js', ['a.js', 'b.js'])
  factory.addCommon('bc.js', ['b.js', 'c.js'])
  factory.addCommon('ac.js', ['a.js', 'c.js'])
  factory.addCommon('common.js', ['ab.js', 'bc.js', 'ac.js'])
  factory.end()

  t.same(
    factory.getBundles().sort(),
    ['a.js', 'ab.js', 'ac.js', 'b.js', 'bc.js', 'c.js', 'common.js']
  )

  var bundleMap = factory.getBundleMap()
  t.same(values(bundleMap['a.js'].modules), ['/page/a.js'])
  t.same(values(bundleMap['b.js'].modules), ['/page/b.js'])
  t.same(values(bundleMap['c.js'].modules), ['/page/c.js'])
  t.same(values(bundleMap['ac.js'].modules), ['/lib/ac.js'])
  t.same(values(bundleMap['bc.js'].modules), ['/lib/bc.js'])
  t.same(values(bundleMap['ab.js'].modules), ['/lib/ab.js'])
  t.same(values(bundleMap['common.js'].modules), ['/lib/abc.js'])

  t.same(bundleMap['a.js'].deps, ['common.js', 'ab.js', 'ac.js'])
  t.same(bundleMap['b.js'].deps, ['common.js', 'ab.js', 'bc.js'])
  t.same(bundleMap['c.js'].deps, ['common.js', 'bc.js', 'ac.js'])
  t.same(bundleMap['ab.js'].deps, ['common.js'])
  t.same(bundleMap['ac.js'].deps, ['common.js'])
  t.same(bundleMap['bc.js'].deps, ['common.js'])
  t.same(bundleMap['common.js'].deps, [])

  t.end()
})

function values(s) {
  var res = []
  s.forEach(function (v) {
    res.push(v)
  })
  return res
}

