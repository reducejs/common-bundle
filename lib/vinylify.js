var thr = require('through2')
var duplexer = require('duplexer2')
var merge = require('merge-stream')
var reverse = require('reversepoint')
var combine = require('stream-combiner2')
var source = require('vinyl-source-stream')
var depsTopoSort = require('deps-topo-sort2')

var addCommon = require('./common')
var Groups = require('./groups')

module.exports = function (opts) {
  return combine.obj(depsTopoSort(), reverse(), createGroups(opts))
}

function createGroups(opts) {
  var wait = thr.obj()
  var output = merge(wait)
  var groupStream = new Groups({
    basedir: opts.basedir,
    groupFilter: opts.groupFilter,
  })
  var rows = []

  groupStream.once('groups', function (groupsMap) {
    groupsMap = addCommon(groupsMap, opts.common)

    var groups = Object.keys(groupsMap)
    var pipelines = Object.create(null)
    var moduleMap = Object.create(null)

    groups.forEach(function (bundleID) {
      groupsMap[bundleID].forEach(function (moduleID) {
        moduleMap[moduleID] = moduleMap[moduleID] || Object.create(null)
        moduleMap[moduleID][bundleID] = true
      })

      pipelines[bundleID] = opts.pack(bundleID)
      output.add(
        pipelines[bundleID].pipe(source(bundleID))
      )
    })

    rows.forEach(function (row) {
      groups.forEach(function (bundleID) {
        if (moduleMap[row.id][bundleID]) {
          pipelines[bundleID].write(row)
        }
      })
    })
    rows.length = 0

    groupStream.once('end', function () {
      groups.forEach(function (bundleID) {
        pipelines[bundleID].end()
      })
      wait.end()
    })
  })

  groupStream.on('data', function (row) {
    rows.push(row)
  })

  return duplexer({ objectMode: true }, groupStream, output)
}

