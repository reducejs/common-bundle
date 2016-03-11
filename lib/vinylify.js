var through = require('./through')
var duplexer = require('duplexer2')
var merge = require('merge-stream')
var reverse = require('reversepoint')
var combine = require('stream-combiner2')
var source = require('vinyl-source-stream')
var depsTopoSort = require('deps-topo-sort2')
var addCommon = require('./common').create
var Groups = require('./groups')

module.exports = function (opts) {
  var groups = createGroups(opts)
  var ret = combine.obj(depsTopoSort(), reverse(), groups)
  groups.once('map', ret.emit.bind(ret, 'map'))
  return ret
}

function createGroups(opts) {
  var wait = through.obj()
  var output = merge(wait)
  var groupStream = new Groups({
    basedir: opts.basedir,
    groupFilter: opts.groupFilter,
  })
  var rows = []
  var ret = duplexer({ objectMode: true }, groupStream, output)

  groupStream.once('map', function (bundleMap) {
    bundleMap = addCommon(bundleMap, opts.common)

    var b
    var pipelines = Object.create(null)
    for (b in bundleMap) {
      bundleMap[b].modules = toMap(bundleMap[b].modules)
      pipelines[b] = opts.pack(b)
      output.add(
        pipelines[b].pipe(source(b, opts.basedir))
      )
    }

    rows.forEach(function (row) {
      for (b in bundleMap) {
        if (bundleMap[b].modules[row.id]) {
          pipelines[b].write(row)
          bundleMap[b].modules[row.id] = row.file
        }
      }
    })
    rows.length = 0

    ret.emit('map', bundleMap)

    groupStream.once('end', function () {
      for (b in bundleMap) {
        pipelines[b].end()
      }
      wait.end()
    })
  })

  groupStream.on('data', function (row) {
    rows.push(row)
  })

  return ret
}

function toMap(arr) {
  return arr.reduce(function (o, e) {
    o[e] = true
    return o
  }, Object.create(null))
}

