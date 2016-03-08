'use strict'

const through = require('./through')
const duplexer = require('duplexer2')
const merge = require('merge-stream')
const reverse = require('reversepoint')
const combine = require('stream-combiner2')
const source = require('vinyl-source-stream')
const depsTopoSort = require('deps-topo-sort2')

const addCommon = require('./common').create
const Groups = require('./groups')

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

    var pipelines = Object.create(null)
    for (let b in bundleMap) {
      bundleMap[b].modules = toMap(bundleMap[b].modules)
      pipelines[b] = opts.pack(b)
      output.add(
        pipelines[b].pipe(source(b, opts.basedir))
      )
    }

    rows.forEach(function (row) {
      for (let b in bundleMap) {
        if (bundleMap[b].modules[row.id]) {
          pipelines[b].write(row)
          bundleMap[b].modules[row.id] = row.file
        }
      }
    })
    rows.length = 0

    ret.emit('map', bundleMap)

    groupStream.once('end', function () {
      for (let b in bundleMap) {
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

