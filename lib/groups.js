'use strict'

const path = require('path')
const Transform = require('stream').Transform
const multimatch = require('multimatch')
const UNKNOWN = '__UNKNOWN__'

class Groups extends Transform {
  constructor(opts) {
    super({ objectMode: true })

    opts = opts || {}
    this.basedir = opts.basedir || process.cwd()
    this._filters = [].concat(opts.groupFilter)
      .filter(Boolean)
      .map(opt => Groups.createFilter(opt, this.basedir))

    // module ID => Set(bundle ID)
    this._module2bundle = new Map()
    // bundle ID
    this._bundles = new Set()
    // module ID: modules that should be included in the UNKNOWN bundle
    this._unknown = []
  }

  _transform(row, _, next) {
    this._filters
      .map(fn => fn(row.file, row))
      .filter(Boolean)
      .forEach(bundle => {
        this._bundles.add(bundle)
        this._addModule(bundle, row.id)
      })

    notEmptyValue(this._module2bundle, row.id)

    var bundles = this._module2bundle.get(row.id)
    if (!bundles.size) {
      bundles.add(UNKNOWN)
    }

    bundles.forEach(bundle => {
      Object.keys(row.deps || {}).forEach(key => {
        this._addModule(bundle, row.deps[key])
      })
    })

    if (bundles.has(UNKNOWN)) {
      this._unknown.push(row.id)
      bundles.delete(UNKNOWN)
    }

    next(null, row)
  }

  _flush(next) {
    // unknown modules should go to all bundles
    this._unknown.forEach(id => {
      this._bundles.forEach(bundle => {
        this._addModule(bundle, id)
      })
    })

    // bundle ID => { modules: [module ID] }
    var map = Object.create(null)
    this._bundles.forEach(bundle => {
      var modules = []
      map[bundle] = { modules }
      this._module2bundle.forEach(function (bundleSet, id) {
        if (bundleSet.has(bundle)) {
          modules.push(id)
        }
      })
    })

    this.emit('map', map)

    next()
  }

  _addModule(bundle, id) {
    notEmptyValue(this._module2bundle, id).add(bundle)
  }

  static createFilter(opts, basedir) {
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
    if (typeof filterEntries !== 'function') {
      if (opts.filter) {
        let filter = [].concat(opts.filter).map(i => Groups.resolveGlob(i, basedir))
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

  static resolveGlob(glob, basedir) {
    if (glob.startsWith('**') || glob.startsWith('!**')) {
      return glob
    }
    if (glob.startsWith('!')) {
      return '!' + path.resolve(basedir, glob.slice(1))
    }
    return path.resolve(basedir, glob)
  }

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

module.exports = Groups
