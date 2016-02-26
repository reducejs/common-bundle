'use strict'

const path = require('path')
const through = require('./lib/through')
const pack = require('browser-pack')
const splicer = require('labeled-stream-splicer')
const vinylify = require('./lib/vinylify')

module.exports = function (b, opts) {
  opts = opts || {}

  let basedir = opts.basedir || b._options.basedir || process.cwd()
  let needRecords = !opts.groups
  let packOpts = Object.assign({}, b._options, {
    raw: true,
    hasExports: true,
  })
  let packer = opts.pack || pack
  let groups = opts.groups || []

  function write(row, _, next) {
    if (row.file && needRecords) {
      groups.push(row.file)
    }
    next(null, row)
  }

  function end(done) {
    let noop = function () {}
    let output = through.obj(noop, noop)

    let vinylStream = vinylify({
      basedir: basedir,
      groupFilter: groups,
      common: opts.common,
      pack: function (bundleID) {
        let options = Object.assign({}, packOpts, { to: bundleID })
        let pipeline = splicer.obj([
          'pack', [ packer(options) ],
          'wrap', [],
        ])

        b.emit('common.pipeline', bundleID, pipeline)
        return pipeline
      },
    })
    vinylStream.pipe(
      through.obj(function (file, _, next) {
        b.emit('log', 'bundle: ' + file.relative)
        output.push(file)
        next()
      }, function (next) {
        output.push(null)
        next()
      })
    )

    let map = {}
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

    vinylStream.once('end', function () {
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

    if (needRecords) {
      groups = []
    }

    done()
  }

  function hookPipeline() {
    b.pipeline.get('record').push(
      through.obj(write, end)
    )
  }

  b.on('reset', hookPipeline)
  hookPipeline()

  return b
}

