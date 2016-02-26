'use strict'

const test = require('tap').test
const common = require('../lib/common')
const util = require('../lib/util')

function toMap(o) {
  let ret = new Map()
  for (let k in o) {
    ret.set(k, new Set(o[k]))
  }
  return ret
}

function toObj(map) {
  let o = {}
  map.forEach(function (v, k) {
    o[k] = util.toArray(v)
  })
  return o
}

const originalGroupsMap = toMap({
  'page/A/index.js': [
    '/path/to/src/page/A/index.js',
    '/path/to/src/lib/a.js',
    '/path/to/src/lib/ab.js',
    '/path/to/src/lib/ac.js',
    '/path/to/src/lib/abc.js',
  ],
  'page/B/index.js': [
    '/path/to/src/page/B/index.js',
    '/path/to/src/lib/b.js',
    '/path/to/src/lib/ab.js',
    '/path/to/src/lib/bc.js',
    '/path/to/src/lib/abc.js',
  ],
  'page/C/index.js': [
    '/path/to/src/page/C/index.js',
    '/path/to/src/lib/c.js',
    '/path/to/src/lib/ac.js',
    '/path/to/src/lib/bc.js',
    '/path/to/src/lib/abc.js',
  ],
})

test('one common for all', function(t) {
  let ret = common(originalGroupsMap, 'common.js')
  t.same(
    toObj(ret.bundle2common),
    {
      'page/A/index.js': [ 'common.js' ],
      'page/B/index.js': [ 'common.js' ],
      'page/C/index.js': [ 'common.js' ],
    }
  )
  t.same(
    toObj(ret.bundle2module),
    {
      'page/A/index.js': [
        '/path/to/src/page/A/index.js',
        '/path/to/src/lib/a.js',
        '/path/to/src/lib/ab.js',
        '/path/to/src/lib/ac.js',
      ],
      'page/B/index.js': [
        '/path/to/src/page/B/index.js',
        '/path/to/src/lib/b.js',
        '/path/to/src/lib/ab.js',
        '/path/to/src/lib/bc.js',
      ],
      'page/C/index.js': [
        '/path/to/src/page/C/index.js',
        '/path/to/src/lib/c.js',
        '/path/to/src/lib/ac.js',
        '/path/to/src/lib/bc.js',
      ],
      'common.js': [
        '/path/to/src/lib/abc.js',
      ],
    }
  )

  t.end()
})

test('one common for each group', function(t) {
  let ret = common(originalGroupsMap, [
    {
      output: 'ab.js',
      filter: ['page/A/index.js', 'page/B/index.js'],
    },
    {
      output: 'bc.js',
      filter: ['page/C/index.js', 'page/B/index.js'],
    },
    {
      output: 'ac.js',
      filter: ['page/A/index.js', 'page/C/index.js'],
    },
    {
      output: 'common.js',
      filter: '**/*.js',
    },
  ])
  t.same(
    toObj(ret.bundle2common),
    {
      'page/A/index.js': [ 'ab.js', 'ac.js', 'common.js' ],
      'page/B/index.js': [ 'ab.js', 'bc.js', 'common.js' ],
      'page/C/index.js': [ 'bc.js', 'ac.js', 'common.js' ],
    }
  )
  t.same(
    toObj(ret.bundle2module),
    {
      'page/A/index.js': [
        '/path/to/src/page/A/index.js',
        '/path/to/src/lib/a.js',
      ],
      'page/B/index.js': [
        '/path/to/src/page/B/index.js',
        '/path/to/src/lib/b.js',
      ],
      'page/C/index.js': [
        '/path/to/src/page/C/index.js',
        '/path/to/src/lib/c.js',
      ],
      'common.js': [
        '/path/to/src/lib/abc.js',
      ],
      'ab.js': [
        '/path/to/src/lib/ab.js',
        '/path/to/src/lib/abc.js',
      ],
      'bc.js': [
        '/path/to/src/lib/bc.js',
        '/path/to/src/lib/abc.js',
      ],
      'ac.js': [
        '/path/to/src/lib/ac.js',
        '/path/to/src/lib/abc.js',
      ],
    }
  )

  t.end()
})

test('common function', function(t) {
  let ret = common(originalGroupsMap, {
    output: 'common.js',
    filter: function (groups) {
      return groups
    },
  })
  t.same(
    toObj(ret.bundle2common),
    {
      'page/A/index.js': [ 'common.js' ],
      'page/B/index.js': [ 'common.js' ],
      'page/C/index.js': [ 'common.js' ],
    }
  )
  t.same(
    toObj(ret.bundle2module),
    {
      'page/A/index.js': [
        '/path/to/src/page/A/index.js',
        '/path/to/src/lib/a.js',
        '/path/to/src/lib/ab.js',
        '/path/to/src/lib/ac.js',
      ],
      'page/B/index.js': [
        '/path/to/src/page/B/index.js',
        '/path/to/src/lib/b.js',
        '/path/to/src/lib/ab.js',
        '/path/to/src/lib/bc.js',
      ],
      'page/C/index.js': [
        '/path/to/src/page/C/index.js',
        '/path/to/src/lib/c.js',
        '/path/to/src/lib/ac.js',
        '/path/to/src/lib/bc.js',
      ],
      'common.js': [
        '/path/to/src/lib/abc.js',
      ],
    }
  )

  t.end()
})

