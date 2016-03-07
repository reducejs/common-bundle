'use strict'

const through = require('./through')
const duplexer = require('duplexer2')
const merge = require('merge-stream')
const reverse = require('reversepoint')
const combine = require('stream-combiner2')
const source = require('vinyl-source-stream')
const depsTopoSort = require('deps-topo-sort2')

const addCommon = require('./common')
const Groups = require('./groups')

module.exports = function (opts) {
  var groups = createGroups(opts)
  var ret = combine.obj(depsTopoSort(), reverse(), groups)
  groups.once('common', ret.emit.bind(ret, 'common'))
  groups.on('output', ret.emit.bind(ret, 'output'))
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

  groupStream.once('groups', function (groupsMap) {
    var maps = addCommon(groupsMap, opts.common)
    groupsMap = maps.bundle2module

    ret.emit('common', maps.bundle2common)

    var pipelines = Object.create(null)

    groupsMap.forEach(function (modules, bundleID) {
      pipelines[bundleID] = opts.pack(bundleID)
      output.add(
        pipelines[bundleID].pipe(source(bundleID, opts.basedir))
      )
    })

    rows.forEach(function (row) {
      groupsMap.forEach(function (modules, bundleID) {
        if (modules.has(row.id)) {
          ret.emit('output', bundleID, row.file)
          pipelines[bundleID].write(row)
        }
      })
    })
    rows.length = 0

    groupStream.once('end', function () {
      groupsMap.forEach(function (modules, bundleID) {
        pipelines[bundleID].end()
      })
      wait.end()
    })
  })

  groupStream.on('data', function (row) {
    rows.push(row)
  })

  return ret
}

