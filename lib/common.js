'use strict'

const multimatch = require('multimatch')

// create a common bundle
// or make bundles depend on another
function createRaw(bundleMap, opts) {
  if (Array.isArray(opts)) {
    opts.forEach(opt => createRaw(bundleMap, opt))
    return bundleMap
  }

  opts = opts || {}
  if (typeof opts === 'string') {
    opts = { output: opts }
  }
  if (!opts.output) {
    return bundleMap
  }

  var bundles = Object.keys(bundleMap)
  var targets = bundles
  if (typeof opts.filter === 'function') {
    targets = opts.filter(bundles)
  } else if (opts.filter) {
    targets = multimatch(bundles, opts.filter)
  }

  if (empty(targets)) {
    return bundleMap
  }

  var common = opts.output
  /**
   * If the common bundle is already created,
   * just make targets depend upon it,
   * which will remove from targets the modules contained in common.
   *
   * Or else a new bundle is created to contain the common modules among targets.
   *
   */
  if (!bundleMap[common]) {
    let modules = intersection.apply(null,
      targets.map(b => bundleMap[b].modules)
    )

    if (!modules.length) {
      return bundleMap
    }

    bundleMap[common] = { modules }
  }

  targets.forEach(function (b) {
    bundleMap[b].deps = bundleMap[b].deps || []
    bundleMap[b].deps.push(common)
  })

  return bundleMap
}

// make the `deps` field contains all bundles needed
function mergeDeps(bundleMap) {
  var visited = Object.create(null)
  for (let b in bundleMap) {
    getDeps(bundleMap, b, visited)
  }
  return bundleMap
}

function getDeps(bundleMap, b, depsMap) {
  // writing or written
  if (depsMap[b]) return depsMap[b]

  depsMap[b] = []
  var bundle = bundleMap[b]
  if (empty(bundle.deps)) return depsMap[b]

  var deps = new Set()
  bundle.deps.forEach(function (k) {
    getDeps(bundleMap, k, depsMap)
      .forEach(i => deps.add(i))
    deps.add(k)
  })
  deps.forEach(k => {
    if (k !== b) {
      depsMap[b].push(k)
    }
  })
  bundle.deps = depsMap[b]
  return bundle.deps
}

// remove modules from bundles already included in their deps
function dedupe(bundleMap) {
  var o = Object.create(null)

  for (let b in bundleMap) {
    let modules = bundleMap[b].modules || []
    o[b] = modules.reduce(function (x, y) {
      x[y] = true
      return x
    }, Object.create(null))
  }

  for (let b in bundleMap) {
    let bundle = bundleMap[b]
    let modules = bundle.modules
    let deps = bundle.deps
    if (!empty(modules) && !empty(deps)) {
      bundle.modules = modules.filter(function (m) {
        return deps.every(k => !o[k][m])
      })
    }
  }

  return bundleMap
}

// remove empty bundles
function clean(bundleMap) {
  for (let file in bundleMap) {
    let bundle = bundleMap[file]
    if (empty(bundle.modules) && empty(bundle.deps)) {
      removeEmptyBundle(bundleMap, file)
      return clean(bundleMap)
    }
  }
  return bundleMap
}

function removeEmptyBundle(bundleMap, b) {
  delete bundleMap[b]
  for (let file in bundleMap) {
    let bundle = bundleMap[file]
    if (!empty(bundle.deps)) {
      bundle.deps = bundle.deps.filter(k => k !== b)
    }
  }
}

function empty(arr) {
  return !arr || !arr.length
}

function intersection() {
  var sets = [].slice.call(arguments)
  var counts = Object.create(null)
  var len = sets.length
  var ret = []
  sets.forEach(function (set) {
    set.forEach(function (e) {
      counts[e] = counts[e] || 0
      if (++counts[e] === len) {
        ret.push(e)
      }
    })
  })
  return ret
}

/**
 * bundleMap:
 * {
 *   bundleID: {
 *     modules: [moduleID],
 *     deps: [bundleID],
 *   }
 * }
 * opts: [{ output: commonID, filter: [bundleID] }]
 */
function create(bundleMap, opts) {
  if (Object.keys(bundleMap).length < 2) {
    return bundleMap
  }
  createRaw(bundleMap, opts)
  mergeDeps(bundleMap)
  dedupe(bundleMap)
  clean(bundleMap)

  return bundleMap
}

module.exports = {
  create,

  createRaw,
  mergeDeps,
  dedupe,
  clean,

  intersection,
}

