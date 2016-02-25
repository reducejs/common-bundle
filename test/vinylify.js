'use strict'

const through = require('../lib/through')
const test = require('tap').test
const reverse = require('reversepoint')
const splicer = require('labeled-stream-splicer')
const concat = require('concat-stream')
const createStream = require('../lib/vinylify')
const ROWS = [
  {
    file: '/path/to/src/page/A/index.css',
    id: '/path/to/src/page/A/index.css',
    source: 'a{}',
    deps: {
      C: '/path/to/node_modules/C/index.css',
    },
  },
  {
    file: '/path/to/src/page/B/index.css',
    id: '/path/to/src/page/B/index.css',
    source: 'b{}',
    deps: {
      C: '/path/to/node_modules/C/index.css',
    },
  },
  {
    file: '/path/to/node_modules/C/index.css',
    id: '/path/to/node_modules/C/index.css',
    source: 'c{}',
    deps: {},
  },
]

test('pack into one bundle', function(t) {
  var stream = createStream({
    basedir: '/path/to/src',
    groupFilter: {
      output: 'bundle.css',
    },
    pack: packCss,
  })

  ROWS.forEach(function (row) {
    stream.write(row)
  })

  stream.end()

  stream.on('data', function (file) {
    file.contents.pipe(concat(function (body) {
      t.equal(body.toString(), 'c{}a{}b{}')
      t.end()
    }))
  })
})

test('pack into multiple bundles', function(t) {
  t.plan(2)
  var stream = createStream({
    basedir: '/path/to/src',
    groupFilter: '**/page/**/*.css',
    pack: packCss,
  })

  ROWS.forEach(function (row) {
    stream.write(row)
  })

  stream.end()

  stream.on('data', function (file) {
    file.contents.pipe(concat(function (body) {
      if (/A\/index\.css/.test(file.path)) {
        t.equal(body.toString(), 'c{}a{}')
      }
      if (/B\/index\.css/.test(file.path)) {
        t.equal(body.toString(), 'c{}b{}')
      }
    }))
  })
})

test('pack into multiple bundles, with common', function(t) {
  t.plan(3)
  var stream = createStream({
    basedir: '/path/to/src',
    groupFilter: '**/page/**/*.css',
    pack: packCss,
    common: {
      output: 'common.css',
      filter: ['page/A/index.css', 'page/B/index.css'],
    },
  })

  ROWS.forEach(function (row) {
    stream.write(row)
  })

  stream.end()

  stream.on('data', function (file) {
    file.contents.pipe(concat(function (body) {
      if (/A\/index\.css/.test(file.path)) {
        t.equal(body.toString(), 'a{}')
      }
      if (/B\/index\.css/.test(file.path)) {
        t.equal(body.toString(), 'b{}')
      }
      if (/common\.css/.test(file.path)) {
        t.equal(body.toString(), 'c{}')
      }
    }))
  })
})

function packCss() {
  return splicer.obj([
    'pack', [ reverse(), packer() ],
    'wrap', [],
  ])
}

function packer() {
  return through.obj(function (row, _, next) {
    next(null, row.source)
  })
}
