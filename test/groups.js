var test = require('tap').test
var Groups = require('../lib/groups')
var thr = require('through2')

test('groupFilter.entries', function(tt) {
  function run(filter, t) {
    var groups = new Groups({
      basedir: '/path/to/src',
      groupFilter: filter,
    })
    groups.once('groups', function (groupsMap) {
      t.same(Object.keys(groupsMap).length, 2)
      t.same(
        groupsMap['page/A/index.js'].sort(),
        [
          '/path/to/node_modules/C/index.js',
          '/path/to/src/page/A/index.js',
        ]
      )
      t.same(
        groupsMap['page/B/index.js'].sort(),
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
    var groups = new Groups({
      basedir: '/path/to/src',
      groupFilter: filter,
    })
    groups.once('groups', function (groupsMap) {
      t.same(Object.keys(groupsMap).length, 3)
      t.same(
        groupsMap['A.js'].sort(),
        [
          '/path/to/node_modules/C/index.js',
          '/path/to/src/page/A/index.js',
        ]
      )
      t.same(
        groupsMap['B.js'].sort(),
        [
          '/path/to/node_modules/C/index.js',
          '/path/to/src/page/B/index.js',
        ]
      )
      t.same(
        groupsMap['C.js'],
        ['/path/to/node_modules/C/index.js']
      )
      t.end()
    })
    source().pipe(groups)
  }

  tt.test('function', run.bind(null, {
    output: function (file) {
      if (/A/.test(file)) {
        return 'A.js'
      }
      if (/B/.test(file)) {
        return 'B.js'
      }
      if (/C/.test(file)) {
        return 'C.js'
      }
    },
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
    {
      filter: '**/C/index.js',
      output: 'C.js',
    },
  ]))

  tt.end()
})

test('groupFilter.one2multiple', function(t) {
  var groupsStream = new Groups({
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
  groupsStream.once('groups', function (groups) {
    t.same(Object.keys(groups).length, 3)
    t.same(
      groups['page/A/index.js'].sort(),
      [
        '/path/to/node_modules/C/index.js',
        '/path/to/src/page/A/index.js',
      ]
    )
    t.same(
      groups['page/B/index.js'].sort(),
      [
        '/path/to/node_modules/C/index.js',
        '/path/to/src/page/B/index.js',
      ]
    )
    t.same(
      groups['bundle.js'].sort(),
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
  var groupsStream = new Groups({
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
  groupsStream.once('groups', function (groups) {
    t.same(Object.keys(groups).length, 2)
    t.same(
      groups['page/A/index.js'].sort(),
      [
        '/path/to/node_modules/C/index.js',
        '/path/to/node_modules/E/index.js',
        '/path/to/src/page/A/index.js',
        '/path/to/src/page/D/index.js',
      ]
    )
    t.same(
      groups['page/B/index.js'].sort(),
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
  source().on('data', function (row) {
    groupsStream.write(row)
  })
  .on('end', function () {
    groupsStream.end()
  })
})

function source() {
  var ret = thr.obj()
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

