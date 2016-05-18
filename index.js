var mixy = require('mixy')
var Transform = require('stream').Transform
var splicer = require('labeled-stream-splicer')
var File = require('vinyl')
var browserPack = require('browser-pack')

var createCustomFactory = require('./lib/custom-factor')
var BundleFactory = require('./lib/bundle-factory')
var createFileResolver = require('./lib/resolver')

module.exports = function (b, opts) {
  var basedir = b._options.basedir || process.cwd()
  var packOpts = mixy.mix({}, b._options, { raw: true, hasExports: true })

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
      createBundleStream(opts, basedir, input),
      // emit meta info about bundles and rows
      collectMaps({ basedir: basedir, input: input })
        .on('map', b.emit.bind(b, 'common.map')),
      // pack and create a vinyl object for each bundle
      vinylify({ basedir: basedir, packOpts: packOpts, packer: browserPack })
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
  return Transform({
    objectMode: true,
    transform: write,
    flush: end,
  })
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

    // relative bundle file path => { modules: [moduleID], deps: [bundlePath] }
    var bundleMap = Object.create(null)
    // absolute file path => id
    var idMap = Object.create(null)
    // id => [bundlePath]
    var moduleMap = Object.create(null)

    bundles.forEach(function (bundle) {
      var relFile = resolver.relative(bundle.file)
      var deps = bundle.deps.map(resolver.relative)
      bundleMap[relFile] = {
        modules: bundle.modules.map(function (row) {
          if (!moduleMap[row.id]) {
            moduleMap[row.id] = {
              file: resolver.relative(row.file),
              bundles: [deps.concat(relFile)],
            }
          } else {
            moduleMap[row.id].bundles.push(deps.concat(relFile))
          }
          idMap[row.file] = row.id
          return row.id
        }),
        deps: deps,
      }
      this.push(bundle)
    }, this)

    input = input.map(function (file) {
      return idMap[file]
    })

    this.emit('map', {
      bundles: bundleMap,
      modules: moduleMap,
      entries: input,
      basedir: basedir,
    })
    next()
  }

  return through(write, end)
}
