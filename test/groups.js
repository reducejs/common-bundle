var test = require('tap').test
var Groups = require('../lib/groups')
var through = require('../lib/through')

test('resolveGlob', function (t) {
  var basedir = '/path/to/src'
  t.equal(
    Groups.resolveGlob('/path/to/build', basedir),
    '/path/to/build'
  )

  t.equal(
    Groups.resolveGlob('page/A/index.js', basedir),
    '/path/to/src/page/A/index.js'
  )

  t.equal(
    Groups.resolveGlob('**/page/A/index.js', basedir),
    '**/page/A/index.js'
  )

  t.equal(
    Groups.resolveGlob('!**/page/A/index.js', basedir),
    '!**/page/A/index.js'
  )

  t.equal(
    Groups.resolveGlob('!page/A/index.js', basedir),
    '!/path/to/src/page/A/index.js'
  )

  t.end()
})

test('createFilter', function (t) {
  var basedir = '/path/to/src'
  t.equal(
    Groups.createFilter(1, basedir),
    Function.prototype,
    'invalid option'
  )

  t.equal(
    Groups.createFilter(function (s) { return s + '/index.js' }, basedir)('/path/to/src/page/A'),
    'page/A/index.js',
    'function, return absolute path'
  )

  t.equal(
    Groups.createFilter(function () { return null }, basedir)('/path/to/src/page/A'),
    undefined,
    'function, return undefined'
  )

  t.equal(
    Groups.createFilter(
      {
        output: function () { return 'page/A/index.js' },
      },
      basedir
    )('/path/to/src/page/A'),
    'page/A/index.js',
    'object, output function, return relative path'
  )

  t.equal(
    Groups.createFilter('page/**/index.js', basedir)('/path/to/src/page/A/index.js'),
    'page/A/index.js',
    'string'
  )

  t.equal(
    Groups.createFilter(['page/**/index.js', '!page/A/index.js'], basedir)('/path/to/src/page/A/index.js'),
    undefined,
    'array, negative, not matched'
  )

  t.equal(
    Groups.createFilter(['page/**/index.js', '!**/A/index.js'], basedir)('/path/to/src/page/A/index.js'),
    undefined,
    'array, negative, not matched, 2'
  )

  t.equal(
    Groups.createFilter(['page/**/index.js', '!page/A/index.js'], basedir)('/path/to/src/page/B/index.js'),
    'page/B/index.js',
    'array, negative, matched'
  )

  t.equal(
    Groups.createFilter({ output: 'bundle.js' }, basedir)('/path/to/src/page/B/index.js'),
    'bundle.js',
    'output, string'
  )

  t.equal(
    Groups.createFilter({ filter: function () { return true } }, basedir)('/path/to/src/page/B/index.js'),
    'page/B/index.js',
    'filter, function'
  )

  t.end()
})

test('groupFilter.entries', function(tt) {
  function run(filter, t) {
    var groups = new Groups({
      basedir: '/path/to/src',
      groupFilter: filter,
    })
    groups.once('map', function (bundleMap) {
      t.same(sort(bundleMap), {
        'page/A/index.js': {
          modules: [
            '/path/to/node_modules/C/index.js',
            '/path/to/src/page/A/index.js',
          ],
        },
        'page/B/index.js': {
          modules: [
            '/path/to/node_modules/C/index.js',
            '/path/to/src/page/B/index.js',
          ],
        },
      })
      t.end()
    })
    source().pipe(groups)
  }

  tt.test('pattern', run.bind(null, '**/page/**/index.js'))

  tt.test('array of patterns', run.bind(
    null, [['**/*.js', '!**/C/index.js']]
  ))

  tt.test('object, pattern', run.bind(null, {
    filter: 'page/**/index.js',
  }))

  tt.test('object, array of patterns', run.bind(null, {
    filter: ['**/*.js', '!**/C/index.js'],
  }))

  tt.test('multiple', run.bind(
    null, ['page/A/*.js', 'page/B/*.js']
  ))

  tt.test('object, multiple', run.bind(null, [
    { filter: 'page/A/*.js' },
    { filter: 'page/B/*.js' },
  ]))

  tt.end()
})

test('groupFilter.output', function(tt) {
  function run(filter, t) {
    var groups = new Groups({
      basedir: '/path/to/src',
      groupFilter: filter,
    })
    groups.once('map', function (bundleMap) {
      t.same(sort(bundleMap), {
        'A.js': {
          modules: [
            '/path/to/node_modules/C/index.js',
            '/path/to/src/page/A/index.js',
          ],
        },
        'B.js': {
          modules: [
            '/path/to/node_modules/C/index.js',
            '/path/to/src/page/B/index.js',
          ],
        },
      })
      t.end()
    })
    source().pipe(groups)
  }

  tt.test('function', run.bind(null, function (file) {
    if (/A/.test(file)) {
      return 'A.js'
    }
    if (/B/.test(file)) {
      return 'B.js'
    }
  }))

  tt.test('string', run.bind(null, [
    {
      filter: 'page/A/index.js',
      output: 'A.js',
    },
    {
      filter: 'page/B/index.js',
      output: 'B.js',
    },
  ]))

  tt.end()
})

test('groupFilter.one2multiple', function(t) {
  var groupsStream = new Groups({
    basedir: '/path/to/src',
    groupFilter: [
      'page/**/index.js',
      {
        filter: 'page/A/index.js',
        output: 'bundle.js',
      },
      {
        filter: 'page/B/index.js',
        output: 'bundle.js',
      },
    ],
  })
  groupsStream.once('map', function (bundleMap) {
    t.same(sort(bundleMap), {
      'page/A/index.js': {
        modules: [
          '/path/to/node_modules/C/index.js',
          '/path/to/src/page/A/index.js',
        ],
      },
      'page/B/index.js': {
        modules: [
          '/path/to/node_modules/C/index.js',
          '/path/to/src/page/B/index.js',
        ],
      },
      'bundle.js': {
        modules: [
          '/path/to/node_modules/C/index.js',
          '/path/to/src/page/A/index.js',
          '/path/to/src/page/B/index.js',
        ],
      },
    })
    t.end()
  })
  source().pipe(groupsStream)
})

test('stray modules', function(t) {
  var groupsStream = new Groups({
    basedir: '/path/to/src',
    groupFilter: [
      {
        filter: 'page/A/index.js',
      },
      {
        filter: 'page/B/index.js',
      },
    ],
  })
  groupsStream.once('map', function (bundleMap) {
    t.same(sort(bundleMap), {
      'page/A/index.js': {
        modules: [
          '/path/to/node_modules/C/index.js',
          '/path/to/node_modules/E/index.js',
          '/path/to/src/page/A/index.js',
          '/path/to/src/page/D/index.js',
        ],
      },
      'page/B/index.js': {
        modules: [
          '/path/to/node_modules/C/index.js',
          '/path/to/node_modules/E/index.js',
          '/path/to/src/page/B/index.js',
          '/path/to/src/page/D/index.js',
        ],
      },
    })
    t.end()
  })
  groupsStream.write({
    id: '/path/to/src/page/D/index.js',
    file: '/path/to/src/page/D/index.js',
    deps: {
      E: '/path/to/node_modules/E/index.js',
    },
  })
  groupsStream.write({
    id: '/path/to/node_modules/E/index.js',
    file: '/path/to/node_modules/E/index.js',
  })
  source()
    .on('data', function (row) { groupsStream.write(row) })
    .on('end', function () { groupsStream.end() })
})

function source() {
  var ret = through.obj()
  ret.write({
    id: '/path/to/src/page/A/index.js',
    file: '/path/to/src/page/A/index.js',
    deps: {
      C: '/path/to/node_modules/C/index.js',
    },
  })
  ret.write({
    id: '/path/to/src/page/B/index.js',
    file: '/path/to/src/page/B/index.js',
    deps: {
      C: '/path/to/node_modules/C/index.js',
    },
  })
  ret.write({
    id: '/path/to/node_modules/C/index.js',
    file: '/path/to/node_modules/C/index.js',
  })
  ret.end()
  return ret
}

function sort(o) {
  Object.keys(o).forEach(function (k) {
    o[k].modules.sort()
  })
  return o
}

