var multimatch = require('multimatch')

// create a common bundle
// or make bundles depend on another
function createRaw(bundleMap, opts) {
  if (Array.isArray(opts)) {
    opts.forEach(function (opt) {
      createRaw(bundleMap, opt)
    })
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
  var modules
  /**
   * If the common bundle is already created,
   * just make targets depend upon it,
   * which will remove from targets the modules contained in common.
   *
   * Or else a new bundle is created to contain the common modules among targets.
   *
   */
  if (!bundleMap[common]) {
    modules = intersection(
      targets.map(function (b) {
        return bundleMap[b].modules
      }),
      opts.threshold
    )

    if (!modules.length) {
      return bundleMap
    }

    bundleMap[common] = { modules: modules }
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
  for (var b in bundleMap) {
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
      .forEach(function (i) { deps.add(i) })
    deps.add(k)
  })
  deps.forEach(function (k) {
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
  var bundles = Object.keys(bundleMap)

  bundles.forEach(function (b) {
    var modules = bundleMap[b].modules || []
    o[b] = modules.reduce(function (x, y) {
      x[y] = true
      return x
    }, Object.create(null))
  })

  bundles.forEach(function (b) {
    var bundle = bundleMap[b]
    var modules = bundle.modules
    var deps = bundle.deps
    if (!empty(modules) && !empty(deps)) {
      bundle.modules = modules.filter(function (m) {
        return deps.every(function (k) { return !o[k][m] })
      })
    }
  })

  return bundleMap
}

// remove empty bundles
function clean(bundleMap) {
  var file
  var bundle
  for (file in bundleMap) {
    bundle = bundleMap[file]
    if (empty(bundle.modules) && empty(bundle.deps)) {
      removeEmptyBundle(bundleMap, file)
      return clean(bundleMap)
    }
  }
  return bundleMap
}

function removeEmptyBundle(bundleMap, b) {
  delete bundleMap[b]
  var file
  var bundle
  for (file in bundleMap) {
    bundle = bundleMap[file]
    if (!empty(bundle.deps)) {
      bundle.deps = bundle.deps.filter(function (k) { return k !== b })
    }
  }
}

function empty(arr) {
  return !arr || !arr.length
}

function intersection(sets, threshold) {
  var counts = Object.create(null)
  var len = sets.length
  var _threshold
  if (typeof threshold === 'function') {
    _threshold = threshold
  } else {
    if (threshold > len) {
      return []
    }

    // By default,
    // if there is only one original bundle, on common will be created
    // else common contains the modules required by all original bundles
    if (typeof threshold !== 'number') {
      if (len < 2) {
        return []
      }
      threshold = len
    }

    _threshold = function (file) {
      // if threshold is less than 2,
      // then original bundles are merge into the common bundle
      return counts[file] >= threshold
    }
  }
  return [].concat.apply([], sets)
    .reduce(function (r, f) {
      if (counts[f]) {
        ++counts[f]
      } else {
        counts[f] = 1
        r.push(f)
      }
      return r
    }, [])
    .filter(function (file) {
      return _threshold(file, counts[file], counts, len)
    })
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
  createRaw(bundleMap, opts)
  mergeDeps(bundleMap)
  dedupe(bundleMap)
  clean(bundleMap)

  return bundleMap
}

module.exports = {
  create: create,

  createRaw: createRaw,
  mergeDeps: mergeDeps,
  dedupe: dedupe,
  clean: clean,

  intersection: intersection,
}

