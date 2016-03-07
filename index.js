'use strict'

const path = require('path')
const through = require('./lib/through')
const pack = require('browser-pack')
const splicer = require('labeled-stream-splicer')
const vinylify = require('./lib/vinylify')

module.exports = function (b, opts) {
  opts = opts || {}

  var basedir = opts.basedir || b._options.basedir || process.cwd()
  var packOpts = Object.assign({}, b._options, {
    raw: true,
    hasExports: true,
  })
  var packer = opts.pack || pack
  var input = []

  function write(row, _, next) {
    if (row.file) {
      input.push(row.file)
    }
    next(null, row)
  }

  function end(done) {
    var noop = function () {}
    var output = through.obj(noop, noop)
    var vinylStream = vinylify({
      basedir: basedir,
      groupFilter: opts.groups || input,
      common: opts.common,
      pack: function (bundleID) {
        var options = Object.assign(
          {}, packOpts, { to: path.resolve(basedir, bundleID) }
        )
        var pipeline = splicer.obj([
          'pack', [ packer(options) ],
          'wrap', [],
        ])

        b.emit('common.pipeline', bundleID, pipeline)
        return pipeline
      },
    })

    var map = {}
    vinylStream.on('output', function (id, file) {
      map[id] = map[id] || {}
      map[id].modules = map[id].modules || []
      map[id].modules.push(path.relative(basedir, file))
    })
    vinylStream.once('common', function (bundle2common) {
      bundle2common.forEach(function (commons, id) {
        map[id] = map[id] || {}
        map[id].deps = []
        for (let i of commons) {
          map[id].deps.push(i)
        }
      })
    })

    vinylStream.on('data', file => output.push(file))
    vinylStream.once('end', function () {
      output.push(null)
      b.emit('common.map', map)
    })

    b.pipeline.get('pack').unshift(
      through.obj(function (row, _, next) {
        vinylStream.write(row)
        next()
      }, function (next) {
        vinylStream.end()
        next()
      })
    )
    b.pipeline.push(output)

    done()
  }

  function hook() {
    input = []
    b.pipeline.get('record').push(through.obj(write, end))
  }

  b.on('reset', hook)
  hook()
}

