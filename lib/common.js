'use strict'

const multimatch = require('multimatch')
const util = require('./util')

/**
 * originalGroupsMap: { bundleID: [moduleID] }
 * common: [{ output: commonID, filter: [bundleID] }]
 */
module.exports = function (originalGroupsMap, common) {
  var groups = util.toArray(originalGroupsMap.keys())
  if (groups.length < 2) {
    return {
      bundle2common: new Map(),
      bundle2module: originalGroupsMap,
    }
  }

  /* commonID: [bundleID], */
  var commonMap = new Map()
  /* bundleID: [commonID], */
  var bundleMap = new Map()
  /* bundleID: [moduleID], */
  var groupsMap = new Map()

  // Build commonMap
  ;[].concat(common).forEach(function (o) {
    if (!o) return

    if (typeof o === 'string') {
      o = { output: o }
    }

    if (!o.output) return

    var targets = groups
    if (typeof o.filter === 'function') {
      targets = o.filter(groups)
    } else if (o.filter) {
      targets = multimatch(groups, o.filter)
    }

    if (targets.length) {
      commonMap.set(o.output, new Set(targets))
      targets.forEach(function (bundleID) {
        util.notEmptyValue(bundleMap, bundleID).add(o.output)
      })
    }
  })

  commonMap.forEach(function (bundles, commonID) {
    var sets = []
    bundles.forEach(b => sets.push(originalGroupsMap.get(b)))
    groupsMap.set(commonID, util.intersection(sets))
  })

  groups.forEach(function (bundleID) {
    var commons = bundleMap.get(bundleID)
    var modules = util.notEmptyValue(groupsMap, bundleID)
    if (!commons) {
      // No common modules
      return originalGroupsMap.get(bundleID).forEach(id => modules.add(id))
    }
    originalGroupsMap.get(bundleID).forEach(function (moduleID) {
      for (let id of commons) {
        // Remove common modules from original bundles
        if (groupsMap.get(id).has(moduleID)) return
      }
      modules.add(moduleID)
    })
  })

  return {
    bundle2common: bundleMap,
    bundle2module: groupsMap,
  }
}

