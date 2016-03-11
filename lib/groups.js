var path = require('path')
var Transform = require('stream').Transform
var multimatch = require('multimatch')
var UNKNOWN = '__UNKNOWN__'
var util = require('util')

util.inherits(Groups, Transform)

function Groups(opts) {
  Transform.call(this, { objectMode: true })

  opts = opts || {}
  this.basedir = opts.basedir || process.cwd()
  this._filters = [].concat(opts.groupFilter)
    .filter(Boolean)
    .map(function (opt) {
      return createFilter(opt, this.basedir)
    }, this)

  // module ID => Set(bundle ID)
  this._module2bundle = new Map()
  // bundle ID
  this._bundles = new Set()
  // module ID: modules that should be included in the UNKNOWN bundle
  this._unknown = []
}

Groups.prototype._transform = function (row, _, next) {
  this._filters
    .map(function (fn) { return fn(row.file, row) })
    .filter(Boolean)
    .forEach(function (bundle) {
      this._bundles.add(bundle)
      this._addModule(bundle, row.id)
    }, this)

  notEmptyValue(this._module2bundle, row.id)

  var bundles = this._module2bundle.get(row.id)
  if (!bundles.size) {
    bundles.add(UNKNOWN)
  }

  bundles.forEach(function (bundle) {
    Object.keys(row.deps || {}).forEach(function (key) {
      this._addModule(bundle, row.deps[key])
    }, this)
  }, this)

  if (bundles.has(UNKNOWN)) {
    this._unknown.push(row.id)
    bundles.delete(UNKNOWN)
  }

  next(null, row)
}

Groups.prototype._flush = function (next) {
  // unknown modules should go to all bundles
  this._unknown.forEach(function (id) {
    this._bundles.forEach(function (bundle) {
      this._addModule(bundle, id)
    }, this)
  }, this)

  // bundle ID => { modules: [module ID] }
  var map = Object.create(null)
  this._bundles.forEach(function (bundle) {
    var modules = []
    map[bundle] = { modules: modules }
    this._module2bundle.forEach(function (bundleSet, id) {
      if (bundleSet.has(bundle)) {
        modules.push(id)
      }
    })
  }, this)

  this.emit('map', map)

  next()
}

Groups.prototype._addModule = function (bundle, id) {
  notEmptyValue(this._module2bundle, id).add(bundle)
}

function createFilter(opts, basedir) {
  opts = opts || {}
  if (typeof opts === 'function') {
    opts = { output: opts }
  } else if (typeof opts === 'string' || Array.isArray(opts)) {
    opts = { filter: opts }
  }
  if (typeof opts !== 'object') {
    return Function.prototype
  }
  if (typeof opts.output === 'function') {
    return function (file, row) {
      var ret = opts.output(file, row)
      if (!ret) return
      ret = path.resolve(basedir, ret)
      // Make sure the returned path is always relative to basedir
      return path.relative(basedir, ret)
    }
  }

  var output = opts.output
  if (typeof output === 'string') {
    output = path.resolve(basedir, output)
  } else {
    output = null
  }
  var filterEntries = opts.filter
  var filter
  if (typeof filterEntries !== 'function') {
    if (opts.filter) {
      filter = [].concat(opts.filter).map(function (i) {
        return resolveGlob(i, basedir)
      })
      filterEntries = function (file) {
        return multimatch(file, filter).length
      }
    } else {
      filterEntries = function () { return true }
    }
  }
  return function (file) {
    if (filterEntries(file)) {
      return path.relative(basedir, output || file)
    }
  }
}

function resolveGlob(glob, basedir) {
  if (startsWith(glob, '**') || startsWith(glob, '!**')) {
    return glob
  }
  if (startsWith(glob, '!')) {
    return '!' + path.resolve(basedir, glob.slice(1))
  }
  return path.resolve(basedir, glob)
}

function notEmptyValue(map, key, defaultValue) {
  if (!map.has(key)) {
    if (arguments.length < 3) {
      defaultValue = new Set()
    }
    map.set(key, defaultValue)
  }
  return map.get(key)
}

function startsWith(s, sub) {
  return s.slice(0, sub.length) === sub
}

module.exports = Groups
Groups.createFilter = createFilter
Groups.resolveGlob = resolveGlob
