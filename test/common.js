'use strict'

const test = require('tap').test
const util = require('../lib/common')

test('intersection', function (t) {
  t.same(
    util.intersection([]), [], 'empty sets'
  )

  t.same(
    util.intersection([1]), [1], 'single array'
  )

  t.same(
    util.intersection([1], [2]), [], 'no intersection'
  )

  t.same(
    util.intersection([1], [2, 1], [1]), [1], 'intersection'
  )

  t.end()
})

test('clean', function (t) {
  t.same(
    util.clean({}),
    {}
  )

  t.same(
    util.clean({ a: {} }),
    {}
  )

  t.same(
    util.clean({ a: { modules: [] } }),
    {}
  )

  t.same(
    util.clean({ a: { modules: ['a'] } }),
    { a: { modules: ['a'] } }
  )

  t.same(
    util.clean({
      a: {
        modules: [],
        deps: ['b'],
      },
      b: {
        modules: ['b'],
      },
    }),
    {
      a: {
        modules: [],
        deps: ['b'],
      },
      b: {
        modules: ['b'],
      },
    }
  )

  t.same(
    util.clean({
      a: {
        modules: [],
        deps: ['b'],
      },
      b: {
        modules: [],
      },
    }),
    {}
  )

  t.end()
})

test('dedupe', function (t) {
  t.same(
    util.dedupe({}),
    {}
  )

  t.same(
    util.dedupe({
      a: { modules: ['a'] },
    }),
    {
      a: { modules: ['a'] },
    }
  )

  t.same(
    util.dedupe({
      a: { modules: ['a'], deps: ['b'] },
      b: { modules: ['a', 'b'] },
    }),
    {
      a: { modules: [], deps: ['b'] },
      b: { modules: ['a', 'b'] },
    }
  )

  t.same(
    util.dedupe({
      a: { modules: ['a', 'aa'], deps: ['b', 'c'] },
      b: { modules: ['a', 'b'] },
      c: { modules: ['aa', 'c'] },
    }),
    {
      a: { modules: [], deps: ['b', 'c'] },
      b: { modules: ['a', 'b'] },
      c: { modules: ['aa', 'c'] },
    }
  )

  t.same(
    util.dedupe({
      a: { modules: ['a', 'b', 'c'], deps: ['b', 'c'] },
      b: { modules: ['b', 'c'], deps: ['c'] },
      c: { modules: ['c'] },
    }),
    {
      a: { modules: ['a'], deps: ['b', 'c'] },
      b: { modules: ['b'], deps: ['c'] },
      c: { modules: ['c'] },
    }
  )

  t.end()
})

test('mergeDeps', function (t) {
  t.same(
    util.mergeDeps({}),
    {}
  )

  t.same(
    util.mergeDeps({
      a: { deps: [] },
    }),
    {
      a: { deps: [] },
    }
  )

  t.same(
    util.mergeDeps({
      a: { deps: ['b'] },
      b: {},
    }),
    {
      a: { deps: ['b'] },
      b: {},
    }
  )

  t.same(
    util.mergeDeps({
      a: { deps: ['b'] },
      b: { deps: [] },
    }),
    {
      a: { deps: ['b'] },
      b: { deps: [] },
    }
  )

  t.same(
    util.mergeDeps({
      a: { deps: ['b'] },
      b: { deps: ['c'] },
      c: {},
    }),
    {
      a: { deps: ['c', 'b'] },
      b: { deps: ['c'] },
      c: {},
    }
  )

  t.same(
    util.mergeDeps({
      a: { deps: ['b', 'c'] },
      b: { deps: ['c'] },
      c: {},
    }),
    {
      a: { deps: ['c', 'b'] },
      b: { deps: ['c'] },
      c: {},
    }
  )

  t.same(
    util.mergeDeps({
      a: {
        modules: ['a', 'ab', 'ac', 'abc'],
        deps: ['ab', 'ac'],
      },
      b: {
        modules: ['b', 'bc', 'ab', 'abc'],
        deps: ['ab', 'bc'],
      },
      c: {
        modules: ['c', 'ac', 'bc', 'abc'],
        deps: ['ac', 'bc'],
      },
      ab: { modules: ['ab', 'abc'], deps: ['abc'] },
      bc: { modules: ['bc', 'abc'], deps: ['abc'] },
      ac: { modules: ['ac', 'abc'], deps: ['abc'] },
      abc: { modules: ['abc'] },
    }),
    {
      a: {
        modules: ['a', 'ab', 'ac', 'abc'],
        deps: ['abc', 'ab', 'ac'],
      },
      b: {
        modules: ['b', 'bc', 'ab', 'abc'],
        deps: ['abc', 'ab', 'bc'],
      },
      c: {
        modules: ['c', 'ac', 'bc', 'abc'],
        deps: ['abc', 'ac', 'bc'],
      },
      ab: { modules: ['ab', 'abc'], deps: ['abc'] },
      bc: { modules: ['bc', 'abc'], deps: ['abc'] },
      ac: { modules: ['ac', 'abc'], deps: ['abc'] },
      abc: { modules: ['abc'] },
    }
  )

  t.end()
})

test('createRaw', function (t) {
  t.same(
    util.createRaw({ x: 1 }),
    { x: 1 },
    'undefined'
  )

  t.same(
    util.createRaw({
      a: { modules: ['a', 'c'] },
      b: { modules: ['b', 'c'] },
    }, { output: 'common' }),
    {
      a: { modules: ['a', 'c'], deps: ['common'] },
      b: { modules: ['b', 'c'], deps: ['common'] },
      common: { modules: ['c'] },
    },
    'no filter'
  )

  t.same(
    util.createRaw({
      a: { modules: ['a', 'c'] },
      b: { modules: ['b', 'c'] },
    }, 'common'),
    {
      a: { modules: ['a', 'c'], deps: ['common'] },
      b: { modules: ['b', 'c'], deps: ['common'] },
      common: { modules: ['c'] },
    },
    'string'
  )

  t.same(
    util.createRaw({
      a: { modules: ['a', 'c'] },
      b: { modules: ['b', 'c'] },
    }, {
      output: 'common',
      filter: function (bundles) {
        return bundles
      },
    }),
    {
      a: { modules: ['a', 'c'], deps: ['common'] },
      b: { modules: ['b', 'c'], deps: ['common'] },
      common: { modules: ['c'] },
    },
    'function'
  )

  t.same(
    util.createRaw({
      a: { modules: ['a', 'c'] },
      b: { modules: ['b', 'c'] },
    }, {
      output: 'common',
      filter: '+(a|b)',
    }),
    {
      a: { modules: ['a', 'c'], deps: ['common'] },
      b: { modules: ['b', 'c'], deps: ['common'] },
      common: { modules: ['c'] },
    },
    'glob'
  )

  t.same(
    util.createRaw({
      a: { modules: ['a', 'c'] },
      b: { modules: ['b', 'c'] },
    }, {
      output: 'common',
      filter: 'd',
    }),
    {
      a: { modules: ['a', 'c'] },
      b: { modules: ['b', 'c'] },
    },
    'empty targets'
  )

  t.same(
    util.createRaw({
      a: { modules: ['a', 'c'] },
      b: { modules: ['b', 'c'] },
    }, {
      output: 'a',
      filter: 'b',
    }),
    {
      a: { modules: ['a', 'c'] },
      b: { modules: ['b', 'c'], deps: ['a'] },
    },
    'output already exists'
  )

  t.same(
    util.createRaw({
      a: { modules: ['a', 'ab', 'ac', 'abc'] },
      b: { modules: ['b', 'bc', 'ab', 'abc'] },
      c: { modules: ['c', 'ac', 'bc', 'abc'] },
    }, [
      {
        output: 'ab',
        filter: '+(a|b)',
      },
      {
        output: 'ac',
        filter: '+(a|c)',
      },
      {
        output: 'bc',
        filter: '+(b|c)',
      },
      {
        output: 'abc',
        filter: '+(ab|bc|ac)',
      },
    ]),
    {
      a: {
        modules: ['a', 'ab', 'ac', 'abc'],
        deps: ['ab', 'ac'],
      },
      b: {
        modules: ['b', 'bc', 'ab', 'abc'],
        deps: ['ab', 'bc'],
      },
      c: {
        modules: ['c', 'ac', 'bc', 'abc'],
        deps: ['ac', 'bc'],
      },
      ab: { modules: ['ab', 'abc'], deps: ['abc'] },
      bc: { modules: ['bc', 'abc'], deps: ['abc'] },
      ac: { modules: ['ac', 'abc'], deps: ['abc'] },
      abc: { modules: ['abc'] },
    },
    'common of commons'
  )

  t.end()
})

test('create', function (t) {
  t.same(
    util.create({
      a: { modules: ['a', 'c'] },
      b: { modules: ['b', 'c'] },
    }, 'common'),
    {
      a: { modules: ['a'], deps: ['common'] },
      b: { modules: ['b'], deps: ['common'] },
      common: { modules: ['c'] },
    },
    'string'
  )

  t.same(
    util.create({
      a: { modules: ['a', 'c'] },
      b: { modules: ['b', 'c'] },
    }, {
      output: 'a',
      filter: 'b',
    }),
    {
      a: { modules: ['a', 'c'] },
      b: { modules: ['b'], deps: ['a'] },
    },
    'output already exists'
  )

  t.same(
    util.create({
      a: { modules: ['a', 'ab', 'ac', 'abc'] },
      b: { modules: ['b', 'bc', 'ab', 'abc'] },
      c: { modules: ['c', 'ac', 'bc', 'abc'] },
    }, [
      {
        output: 'ab',
        filter: '+(a|b)',
      },
      {
        output: 'ac',
        filter: ['+(a|c)', '!ab'],
      },
      {
        output: 'bc',
        filter: ['+(b|c)', '!ab', '!ac'],
      },
      {
        output: 'abc',
        filter: '+(ab|bc|ac)',
      },
    ]),
    {
      a: {
        modules: ['a'],
        deps: ['abc', 'ab', 'ac'],
      },
      b: {
        modules: ['b'],
        deps: ['abc', 'ab', 'bc'],
      },
      c: {
        modules: ['c'],
        deps: ['abc', 'ac', 'bc'],
      },
      ab: { modules: ['ab'], deps: ['abc'] },
      bc: { modules: ['bc'], deps: ['abc'] },
      ac: { modules: ['ac'], deps: ['abc'] },
      abc: { modules: ['abc'] },
    },
    'common of commons'
  )

  t.end()
})

