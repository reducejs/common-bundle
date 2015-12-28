var mixy = require('mixy')
var thr = require('through2')
var pack = require('browser-pack')
var splicer = require('labeled-stream-splicer')

var vinylify = require('./lib/vinylify')

module.exports = function (b, opts) {
  opts = opts || {}

  var basedir = opts.basedir || b._options.basedir || process.cwd()
  var needRecords = !opts.groups
  var packOpts = mixy.mix({}, b._options, {
    raw: true,
    hasExports: true,
  })
  var packer = opts.pack || pack
  var groups = opts.groups || []

  function write(row, _, next) {
    if (row.file && needRecords) {
      groups.push(row.file)
    }
    next(null, row)
  }

  function end(next) {
    var noop = function () {}
    var output = thr.obj(noop, noop)

    var vinylStream = vinylify({
      basedir: basedir,
      groupFilter: groups,
      common: opts.common,
      pack: function () {
        return splicer.obj([
          'pack', [ packer(packOpts) ],
          'wrap', [],
        ])
      },
    })
    vinylStream.pipe(thr.obj(function (file, _, cb) {
      output.push(file)
      cb()
    }, function (cb) {
      output.push(null)
      cb()
    }))
    b.pipeline.get('pack').unshift(thr.obj(function (row, _, cb) {
      vinylStream.write(row)
      cb()
    }, function (cb) {
      vinylStream.end()
      cb()
    }))
    b.pipeline.push(output)

    if (needRecords) {
      groups = []
    }

    next()
  }

  function hookPipeline() {
    b.pipeline.get('record').push(thr.obj(write, end))
  }

  b.on('reset', hookPipeline)
  hookPipeline()

  return b
}

