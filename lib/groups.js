var path = require('path')
var util = require('util')
var Transform = require('stream').Transform
var multimatch = require('multimatch')
var objectEach = require('mixy').each

util.inherits(Groups, Transform)

module.exports = Groups

var UNKNOWN = '__UNKNOWN__'
var noop = function () {}

function Groups(opts) {
  Transform.call(this, { objectMode: true })

  opts = opts || {}
  this.basedir = opts.basedir || process.cwd()
  this._groupFilters = [].concat(opts.groupFilter)
    .filter(Boolean).map(this.createFilter, this)

  this._groups = Object.create(null)
  this._bundles = Object.create(null)
  this._unknown = []
}

Groups.prototype._transform = function(row, _, next) {
  var moduleID = row.id
  this.getGroups(row).forEach(function (group) {
    this._bundles[group] = true
    this._addGroup(moduleID, group)
  }, this)

  // Ensure that `this._groups[moduleID]` is ready
  this._addGroup(moduleID)

  var groups = Object.keys(this._groups[moduleID])
  if (!groups.length) {
    groups.push(UNKNOWN)
  }

  groups.forEach(function (group) {
    this.addGroup(row, group)
  }, this)

  next(null, row)
}

Groups.prototype._flush = function(next) {
  var bundles = Object.keys(this._bundles)
  this._unknown.forEach(function (moduleID) {
    bundles.forEach(function (bundleID) {
      this._addGroup(moduleID, bundleID)
    }, this)
  }, this)

  var groups = this._groups
  this.emit('groups', bundles.reduce(function (map, bundleID) {
    var modules = map[bundleID] = []
    objectEach(groups, function (bundleMap, moduleID) {
      if (bundleMap[bundleID]) {
        modules.push(moduleID)
      }
    })
    return map
  }, Object.create(null)))

  next()
}

Groups.prototype._addGroup = function(moduleID, group) {
  var groups = this._groups[moduleID]
  if (!groups) {
    groups = Object.create(null)
  }
  if (group) {
    groups[group] = true
  }
  this._groups[moduleID] = groups
}

Groups.prototype.addGroup = function(row, group) {
  Object.keys(row.deps || {}).forEach(function (key) {
    this._addGroup(row.deps[key], group)
  }, this)

  var moduleID = row.id

  if (this._groups[moduleID][UNKNOWN]) {
    delete this._groups[moduleID][UNKNOWN]
  }

  if (group === UNKNOWN) {
    this._unknown.push(moduleID)
  }
}

Groups.prototype.createFilter = function(opts) {
  if (typeof opts === 'function') {
    opts = { output: opts }
  } else if (typeof opts === 'string' || Array.isArray(opts)) {
    opts = { entries: opts }
  }
  if (typeof opts !== 'object') return noop
  if (typeof opts.output === 'function') return opts.output

  var output = opts.output
  if (typeof output !== 'string') output = null
  var filterEntries = opts.entries
  if (typeof filterEntries !== 'function') {
    filterEntries = function (file) {
      if (!opts.entries) return true
      return multimatch(file, opts.entries).length
    }
  }
  var basedir = opts.basedir || this.basedir
  return function (row) {
    if (filterEntries(row.file, row)) {
      return output || path.relative(basedir, row.file)
    }
  }
}

Groups.prototype.getGroups = function(row) {
  return this._groupFilters.map(function (filter) {
    return filter(row)
  }).filter(Boolean)
}

