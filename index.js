var path = require('path')
var mixy = require('mixy')
var Transform = require('stream').Transform
var splicer = require('labeled-stream-splicer')
var File = require('vinyl')

var createCustomFactory = require('./lib/custom-factor')
var BundleFactory = require('./lib/bundle-factory')
var createFileResolver = require('./lib/resolver')

/**
 * opts.basedir: `base` for vinyl objects, `b._options.basedir` by default
 * opts.pack: custom packer, `browser-pack` by default
 * opts.factor: specify how to create factors. See `custom-factor'`
 *
 */
module.exports = function (b, opts) {
  var rawOpts = opts
  opts = opts || {}
  if (typeof opts === 'string') {
    opts = {
      factor: function () {
        // single bundle
        this.add(rawOpts, this.getBundles(), false)
      },
    }
  } else if (typeof opts === 'function') {
    opts = { factor: opts }
  }

  var basedir = opts.basedir || b._options.basedir || process.cwd()
  var packOpts = mixy.mix({}, b._options, { raw: true, hasExports: true })
  var packer = opts.pack || require('browser-pack')

  b.on('reset', reset)
  reset()

  function reset() {
    var input = []
    var output = through(
      function (row, enc, next) { next() },
      function () {}
    )
    b.pipeline.push(output)
    b.pipeline.get('record').push(through(function (row, enc, next) {
      if (row.file) {
        input.push(row.file)
      }
      next(null, row)
    }))
    b.pipeline.get('pack').unshift(
      // group rows into bundles
      createBundleStream(opts.factor, basedir, input),
      // emit meta info about bundles and rows
      collectMaps({ basedir: basedir, input: input })
        .on('map', b.emit.bind(b, 'common.map')),
      // pack and create a vinyl object for each bundle
      vinylify({ basedir: basedir, packOpts: packOpts, packer: packer })
        .on('pipeline', b.emit.bind(b, 'common.pipeline')),
      through(
        function (file, enc, next) {
          output.push(file)
          next()
        },
        function (next) {
          output.push(null)
          next()
        }
      )
    )
  }
}

function createBundleStream(opts, basedir, input) {
  var factory = new BundleFactory({ basedir: basedir })
  function write(row, enc, next) {
    factory.addModule(row)
    next()
  }
  function end(next) {
    factory.start()
    createCustomFactory(opts).call(factory, input, factory.rowMap)
    factory.end()

    var bundleMap = factory.getBundleMap()
    factory.getBundles().forEach(function (b) {
      var modules = []
      bundleMap[b].modules.forEach(function (m) {
        modules.push(factory.rowMap[m])
      })
      this.push({
        file: b,
        modules: modules,
        deps: bundleMap[b].deps,
      })
    }, this)

    next()
  }
  return through(write, end)
}

function through(write, end) {
  var ret = Transform({ objectMode: true })
  ret._transform = write || function (c, _, next) {
    next(null, c)
  }
  ret._flush = end
  return ret
}

function vinylify(opts) {
  var basedir = opts.basedir
  var packOpts = opts.packOpts
  var packer = opts.packer

  return through(
    function (bundle, enc, next) {
      var packOptions = mixy.mix({}, packOpts, { to: bundle.file })
      var pipeline = splicer.obj([
        'pack', [ packer(packOptions) ],
        'wrap', [],
      ])

      this.emit('pipeline', bundle.file, pipeline)

      this.push(new File({
        contents: pipeline,
        path: bundle.file,
        base: basedir,
      }))

      bundle.modules.sort(function (a, b) {
        return a.file < b.file ? -1 : 1
      })
      .forEach(function (row) {
        pipeline.write(row)
      })
      pipeline.end()

      next()
    }
  )
}

function collectMaps(opts) {
  var input = opts.input
  var basedir = opts.basedir
  var bundles = []
  var resolver = createFileResolver(basedir)

  function write(bundle, enc, next) {
    bundles.push(bundle)
    next()
  }

  function end(next) {
    // input won't be ready until the first bundle arrives
    // so we create inputMap here
    var inputMap = input.reduce(function (o, file) {
      o[file] = true
      return o
    }, {})
    var bundleMap = {}
    var fileMap = {}
    bundles.forEach(function (bundle) {
      var relFile = resolver.relative(bundle.file)
      bundleMap[relFile] = {
        modules: bundle.modules.map(function (row) {
          if (inputMap[row.file]) {
            inputMap[row.file] = relFile
          }
          fileMap[row.id] = resolver.relative(row.file)
          return row.id
        }),
        deps: bundle.deps.map(resolver.relative),
      }
      this.push(bundle)
    }, this)

    var inputMapRes = {}
    input.forEach(function (file) {
      var b = inputMap[file]
      inputMapRes[resolver.relative(file)] = bundleMap[b].deps.concat(b)
    })
    this.emit('map', bundleMap, inputMapRes, fileMap)
    next()
  }

  return through(write, end)
}
