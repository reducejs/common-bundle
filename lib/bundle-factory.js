var multimatch = require('multimatch')
var createFileResolver = require('./resolver')

module.exports = BundleFactory

function BundleFactory(opts) {
  // all module files
  this.modules = []
  // file => row
  this.rowMap = Object.create(null)
  // id => file
  this.fileMap = Object.create(null)

  var basedir = opts && opts.basedir
  this.resolve = createFileResolver(basedir).resolve
}

BundleFactory.prototype.addModule = function (row) {
  if (!this.rowMap[row.file]) {
    this.modules.push(row.file)
    this.rowMap[row.file] = row
    this.fileMap[row.id] = row.file
  }
}

BundleFactory.prototype.start = function () {
  this.state = {
    // all bundle files
    bundles: [],
    // file => { modules: Set, deps: Set }
    bundleMap: Object.create(null),
    // file => a set of nodes reachable from file (inclusive)
    visited: {},
    // file => true
    unvisited: {},
  }
  this.modules.forEach(function (file) {
    this.state.unvisited[file] = true
  }, this)
}

BundleFactory.prototype.end = function () {
  this._buildDeps()
  this._processUnvisited()
}

BundleFactory.prototype._processUnvisited = function () {
  var state = this.state
  var unvisited = Object.keys(state.unvisited)
  if (unvisited.length) {
    var modules = this.walk(unvisited)
    var bundleMap = state.bundleMap
    for (var bundle in bundleMap) {
      if (bundleMap[bundle].deps.length) {
        dedupe(modules, bundleMap[bundle].modules)
      } else {
        merge(bundleMap[bundle].modules, modules)
      }
    }
  }
}

BundleFactory.prototype.add = function (bundle, modules, hasMagic) {
  var state = this.state
  if (hasMagic) {
    modules = this.getModules(modules)
  } else {
    modules = [].concat(modules).map(this.resolve)
  }
  modules = this.walk(modules)
  bundle = this.resolve(bundle)
  if (state.bundleMap[bundle]) {
    merge(state.bundleMap[bundle].modules, modules)
  } else {
    state.bundles.push(bundle)
    state.bundleMap[bundle] = { modules: modules }
  }
}

BundleFactory.prototype.walk = function (roots) {
  var modules = new Set()
  roots.forEach(function (m) {
    if (this.rowMap[m]) {
      merge(modules, this._walk(m))
    }
  }, this)
  return modules
}

BundleFactory.prototype._walk = function (root) {
  var state = this.state
  if (state.visited[root]) {
    return state.visited[root]
  }
  delete state.unvisited[root]

  var modules = state.visited[root] = new Set()
  if (this.rowMap[root].deps) {
    Object.keys(this.rowMap[root].deps)
    .map(function (k) {
      return this.rowMap[root].deps[k]
    }, this)
    .forEach(function (id) {
      merge(modules, this._walk(this.fileMap[id]))
    }, this)
  }
  modules.add(root)
  return modules
}

// select modules from bundles
BundleFactory.prototype.selectModulesFromBundles =
BundleFactory.prototype.select = function (pattern, threshold, hasMagic) {
  if (typeof threshold === 'boolean') {
    hasMagic = threshold
    threshold = null
  }
  var groups = Object.create(null)
  var bundles
  if (hasMagic) {
    bundles = this.getBundles(pattern)
  } else {
    bundles = [].concat(pattern).map(this.resolve)
  }
  var state = this.state
  bundles.forEach(function (bundle) {
    state.bundleMap[bundle].modules.forEach(function (m) {
      if (!groups[m]) {
        groups[m] = []
      }
      groups[m].push(bundle)
    })
  })

  var res = []
  if (typeof threshold !== 'function') {
    threshold = wrapThreshold(
      typeof threshold === 'number' ? threshold : bundles.length - 1
    )
  }
  for (var m in groups) {
    if (threshold(this.rowMap[m], groups[m])) {
      res.push(m)
    }
  }
  return res
}

BundleFactory.prototype.addCommon = function (name, pattern, threshold) {
  var bundles = this.getBundles(pattern)
  this.add(name, this.select(bundles, threshold, false))
  this.dedupe(name, bundles, false)
}

BundleFactory.prototype.addDependents =
BundleFactory.prototype.dedupe = function (dep, dependents, hasMagic) {
  var bundleMap = this.state.bundleMap
  dep = this.resolve(dep)
  if (!bundleMap[dep]) {
    return
  }
  var bundles
  if (hasMagic) {
    bundles = this.getBundles(dependents)
  } else {
    bundles = [].concat(dependents).map(this.resolve)
  }
  bundles.forEach(function (b) {
    var bundle = bundleMap[b]
    if (b === dep || !bundle) {
      return
    }
    bundle.deps = bundle.deps || new Set()
    bundle.deps.add(dep)
  })
}

// flattern the deps and dedupe
BundleFactory.prototype._buildDeps = function () {
  var state = this.state
  var bundles = state.bundles
  var bundleMap = state.bundleMap

  var depsMap = {}

  bundles.forEach(function walk(b) {
    if (depsMap[b]) {
      return depsMap[b]
    }
    depsMap[b] = {}
    if (bundleMap[b].deps) {
      bundleMap[b].deps.forEach(function (bb) {
        for (var i in walk(bb)) {
          if (i !== b) {
            depsMap[b][i] = true
          }
        }
        depsMap[b][bb] = true
      })
    }
    return depsMap[b]
  })

  bundles.forEach(function (b) {
    bundleMap[b].deps = Object.keys(depsMap[b] || {}).sort(cmp)
    bundleMap[b].deps.forEach(function (dep) {
      dedupe(bundleMap[dep].modules, bundleMap[b].modules)
    })
  })

  function cmp(a, b) {
    if (depsMap[a][b]) {
      return 1
    }
    if (depsMap[b][a]) {
      return -1
    }
    return 0
  }
}

BundleFactory.prototype.getModules = function (pattern) {
  if (!pattern) {
    return this.modules
  }
  return multimatch(this.modules, [].concat(pattern).map(this.resolve))
}

BundleFactory.prototype.getBundles = function (pattern) {
  var state = this.state
  if (!pattern) {
    return state.bundles
  }
  return multimatch(state.bundles, [].concat(pattern).map(this.resolve))
}

BundleFactory.prototype.getBundleMap = function () {
  return this.state.bundleMap
}

function merge(receiver, provider) {
  provider.forEach(function (m) {
    receiver.add(m)
  })
}

function dedupe(refModules, targetModules) {
  var deduped = []
  refModules.forEach(function (m) {
    if (targetModules.has(m)) {
      targetModules.delete(m)
      deduped.push(m)
    }
  })
  return deduped
}

function wrapThreshold(threshold) {
  return function (row, groups) {
    return groups.length > threshold
  }
}

