'use strict'

const multimatch = require('multimatch')
const util = require('./util')

/**
 * originalGroupsMap: { bundleID: [moduleID] }
 * common: [{ output: commonID, filter: [bundleID] }]
 */
module.exports = function (originalGroupsMap, common) {
  /* commonID: [bundleID], */
  let commonMap = new Map()
  /* bundleID: [commonID], */
  let bundleMap = new Map()

  /* bundleID: [moduleID], */
  let groupsMap = new Map()

  let groups = util.toArray(originalGroupsMap.keys())

  // Build commonMap
  ;[].concat(common).forEach(function (o) {
    if (!o) return

    if (typeof o === 'string') {
      o = { output: o }
    }

    if (!o.output) return

    let targets = groups
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
    let sets = []
    bundles.forEach(b => sets.push(originalGroupsMap.get(b)))
    groupsMap.set(commonID, util.intersection(sets))
  })

  groups.forEach(function (bundleID) {
    let commons = bundleMap.get(bundleID)
    let modules = util.notEmptyValue(groupsMap, bundleID)
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

  return groupsMap
}

