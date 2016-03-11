var path = require('path')
var through = require('./lib/through')
var pack = require('browser-pack')
var splicer = require('labeled-stream-splicer')
var vinylify = require('./lib/vinylify')
var mixy = require('mixy')

module.exports = function (b, opts) {
  opts = opts || {}

  var basedir = opts.basedir || b._options.basedir || process.cwd()
  var packOpts = mixy.mix({}, b._options, {
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
        var options = mixy.mix(
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

    var inputFiles = input
    vinylStream.once('map', function (bundleMap) {
      var inputMap = inputFiles.reduce(function (o, file) {
        o[file] = new Set()
        return o
      }, Object.create(null))

      Object.keys(bundleMap).forEach(function (bundle) {
        var modules = values(bundleMap[bundle].modules)
        var moduleMap = toMap(modules)
        inputFiles.forEach(function (file) {
          if (moduleMap[file]) {
            [].concat(bundleMap[bundle].deps, bundle)
              .filter(Boolean)
              .forEach(function (i) {
                inputMap[file].add(i)
              })
          }
        })
        bundleMap[bundle].modules = modules
      })

      Object.keys(inputMap).forEach(function (k) {
        var bundles = inputMap[k]
        inputMap[k] = []
        bundles.forEach(function (x) {
          inputMap[k].push(x)
        })
      })
      b.emit('common.map', bundleMap, inputMap)
    })
    vinylStream.on('data', function (file) {
      output.push(file)
    })
    vinylStream.once('end', function () {
      output.push(null)
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

function values(o) {
  return Object.keys(o).map(function (k) { return o[k] })
}

function toMap(arr) {
  return arr.reduce(function (o, k) {
    o[k] = true
    return o
  }, Object.create(null))
}
