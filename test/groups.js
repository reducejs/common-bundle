'use strict'

const test = require('tap').test
const Groups = require('../lib/groups')
const through = require('../lib/through')

test('groupFilter.entries', function(tt) {
  function run(filter, t) {
    let groups = new Groups({
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
    let groups = new Groups({
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
  let groupsStream = new Groups({
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
  let groupsStream = new Groups({
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
    .on('data', row => groupsStream.write(row))
    .on('end', () => groupsStream.end())
})

function source() {
  let ret = through.obj()
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

