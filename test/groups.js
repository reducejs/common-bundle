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
    groups.once('groups', function (groupsMap) {
      t.same(groupsMap.size, 2)
      t.same(
        sort(groupsMap.get('page/A/index.js')),
        [
          '/path/to/node_modules/C/index.js',
          '/path/to/src/page/A/index.js',
        ]
      )
      t.same(
        sort(groupsMap.get('page/B/index.js')),
        [
          '/path/to/node_modules/C/index.js',
          '/path/to/src/page/B/index.js',
        ]
      )
      t.end()
    })
    source().pipe(groups)
  }

  tt.test('pattern', run.bind(null, '**/page/**/index.js'))

  tt.test('array of patterns', run.bind(
    null, [['**/*.js', '!**/C/index.js']]
  ))

  tt.test('object, pattern', run.bind(null, {
    filter: '**/page/**/index.js',
  }))

  tt.test('object, array of patterns', run.bind(null, {
    filter: ['**/*.js', '!**/C/index.js'],
  }))

  tt.test('multiple', run.bind(
    null, ['**/page/A/*.js', '**/page/B/*.js']
  ))

  tt.test('object, multiple', run.bind(null, [
    { filter: '**/page/A/*.js' },
    { filter: '**/page/B/*.js' },
  ]))

  tt.end()
})

test('groupFilter.output', function(tt) {
  function run(filter, t) {
    let groups = new Groups({
      basedir: '/path/to/src',
      groupFilter: filter,
    })
    groups.once('groups', function (groupsMap) {
      t.same(groupsMap.size, 2)
      t.same(
        sort(groupsMap.get('A.js')),
        [
          '/path/to/node_modules/C/index.js',
          '/path/to/src/page/A/index.js',
        ]
      )
      t.same(
        sort(groupsMap.get('B.js')),
        [
          '/path/to/node_modules/C/index.js',
          '/path/to/src/page/B/index.js',
        ]
      )
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
      filter: '**/A/index.js',
      output: 'A.js',
    },
    {
      filter: '**/B/index.js',
      output: 'B.js',
    },
  ]))

  tt.end()
})

test('groupFilter.one2multiple', function(t) {
  let groupsStream = new Groups({
    basedir: '/path/to/src',
    groupFilter: [
      '**/page/**/index.js',
      {
        filter: '**/page/A/index.js',
        output: 'bundle.js',
      },
      {
        filter: '**/page/B/index.js',
        output: 'bundle.js',
      },
    ],
  })
  groupsStream.once('groups', function (groupsMap) {
    t.same(groupsMap.size, 3)
    t.same(
      sort(groupsMap.get('page/A/index.js')),
      [
        '/path/to/node_modules/C/index.js',
        '/path/to/src/page/A/index.js',
      ]
    )
    t.same(
      sort(groupsMap.get('page/B/index.js')),
      [
        '/path/to/node_modules/C/index.js',
        '/path/to/src/page/B/index.js',
      ]
    )
    t.same(
      sort(groupsMap.get('bundle.js')),
      [
        '/path/to/node_modules/C/index.js',
        '/path/to/src/page/A/index.js', '/path/to/src/page/B/index.js',
      ]
    )
    t.end()
  })
  source().pipe(groupsStream)
})

test('stray modules', function(t) {
  let groupsStream = new Groups({
    basedir: '/path/to/src',
    groupFilter: [
      {
        filter: '**/page/A/index.js',
      },
      {
        filter: '**/page/B/index.js',
      },
    ],
  })
  groupsStream.once('groups', function (groupsMap) {
    t.same(groupsMap.size, 2)
    t.same(
      sort(groupsMap.get('page/A/index.js')),
      [
        '/path/to/node_modules/C/index.js',
        '/path/to/node_modules/E/index.js',
        '/path/to/src/page/A/index.js',
        '/path/to/src/page/D/index.js',
      ]
    )
    t.same(
      sort(groupsMap.get('page/B/index.js')),
      [
        '/path/to/node_modules/C/index.js',
        '/path/to/node_modules/E/index.js',
        '/path/to/src/page/B/index.js',
        '/path/to/src/page/D/index.js',
      ]
    )
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

function sort(set) {
  let arr = []
  set.forEach(v => arr.push(v))
  return arr.sort()
}

