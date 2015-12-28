var multimatch = require('multimatch')
var mixy = require('mixy')
var objectEach = mixy.each

/**
 * originalGroupsMap: { bundleID: [moduleID] }
 * common: [{ output: commonID, filter: [bundleID] }]
 */
module.exports = function (originalGroupsMap, common) {
  /* commonID: [bundleID], */
  var commonMap = Object.create(null)
  /* bundleID: [commonID], */
  var bundleMap = Object.create(null)

  /* bundleID: [moduleID], */
  var groupsMap = Object.create(null)

  var groups = Object.keys(originalGroupsMap)

  // Build commonMap
  ;[].concat(common).forEach(function (o) {
    if (!o || !o.output) return
    var targets
    if (typeof o.filter === 'function') {
      targets = [].concat(o.filter(groups))
    } else {
      targets = o.filter ? multimatch(groups, o.filter) : []
    }
    if (targets.length) {
      commonMap[o.output] = targets
      targets.forEach(function (bundleID) {
        bundleMap[bundleID] = bundleMap[bundleID] || []
        bundleMap[bundleID].push(o.output)
      })
    }
  })

  objectEach(commonMap, function (bundles, commonID) {
    var commonModules = getIntersection(bundles.map(function (bundleID) {
      return originalGroupsMap[bundleID]
    }))
    groupsMap[commonID] = commonModules
  })
  groups.forEach(function (bundleID) {
    groupsMap[bundleID] = originalGroupsMap[bundleID].filter(function (moduleID) {
      return !isCommonModule(bundleMap[bundleID], moduleID)
    })
  })

  function isCommonModule(commonBundles, moduleID) {
    return commonBundles && commonBundles.some(function (bundleID) {
      return groupsMap[bundleID].indexOf(moduleID) > -1
    })
  }

  return groupsMap
}

function getIntersection(arr) {
  var counts = {}
  var len = arr.length
  var ret = []
  arr.forEach(function (ar) {
    ar.forEach(function (e) {
      counts[e] = counts[e] || 0
      if (++counts[e] === len) {
        ret.push(e)
      }
    })
  })
  return ret
}

