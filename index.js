'use strict'

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

  function end(next) {
    let noop = function () {}
    let output = through.obj(noop, noop)

    let vinylStream = vinylify({
      basedir: basedir,
      groupFilter: groups,
      common: opts.common,
      pack: function (bundleID) {
        let options = Object.assign({}, packOpts, {
          to: bundleID,
        })
        let pipeline = splicer.obj([
          'pack', [ packer(options) ],
          'wrap', [],
        ])

        b.emit('common.pipeline', bundleID, pipeline)
        return pipeline
      },
    })
    vinylStream.pipe(
      through.obj(function (file, _, cb) {
        b.emit('log', 'New bundle: ' + file.relative)
        output.push(file)
        cb()
      }, function (cb) {
        output.push(null)
        cb()
      })
    )

    b.pipeline.get('pack').unshift(
      through.obj(function (row, _, cb) {
        vinylStream.write(row)
        cb()
      }, function (cb) {
        vinylStream.end()
        cb()
      })
    )
    b.pipeline.push(output)

    if (needRecords) {
      groups = []
    }

    next()
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

