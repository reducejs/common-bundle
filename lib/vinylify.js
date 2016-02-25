'use strict'

const through = require('./through')
const duplexer = require('duplexer2')
const merge = require('merge-stream')
const reverse = require('reversepoint')
const combine = require('stream-combiner2')
const source = require('vinyl-source-stream')
const depsTopoSort = require('deps-topo-sort2')
const util = require('../lib/util')

const addCommon = require('./common')
const Groups = require('./groups')

module.exports = function (opts) {
  return combine.obj(depsTopoSort(), reverse(), createGroups(opts))
}

function createGroups(opts) {
  let wait = through.obj()
  let output = merge(wait)
  let groupStream = new Groups({
    basedir: opts.basedir,
    groupFilter: opts.groupFilter,
  })
  let rows = []

  groupStream.once('groups', function (groupsMap) {
    groupsMap = addCommon(groupsMap, opts.common)

    let pipelines = Object.create(null)

    groupsMap.forEach(function (modules, bundleID) {
      pipelines[bundleID] = opts.pack(bundleID)
      output.add(
        pipelines[bundleID].pipe(source(bundleID))
      )
    })

    rows.forEach(function (row) {
      groupsMap.forEach(function (modules, bundleID) {
        if (modules.has(row.id)) {
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

  return duplexer({ objectMode: true }, groupStream, output)
}

