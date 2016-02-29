'use strict'

const path = require('path')
const Transform = require('stream').Transform
const multimatch = require('multimatch')
const UNKNOWN = '__UNKNOWN__'
const util = require('./util')

class Groups extends Transform {
  constructor(opts) {
    super({ objectMode: true })

    opts = opts || {}
    this.basedir = opts.basedir || process.cwd()
    this._filters = [].concat(opts.groupFilter)
      .filter(Boolean)
      .map(opt => this.createFilter(opt))

    // module ID => Array(bundle ID)
    this._module2bundle = new Map()
    // bundle ID
    this._bundles = new Set()
    // module ID: modules that should be included in the UNKNOWN bundle
    this._unknown = []
  }

  _transform(row, _, next) {
    let moduleID = row.id
    this._filters
      .map(fn => fn(row.file))
      .filter(Boolean)
      .forEach(bundle => {
        this._bundles.add(bundle)
        this._addModule(bundle, moduleID)
      })

    util.notEmptyValue(this._module2bundle, moduleID)

    let bundles = this._module2bundle.get(moduleID)
    if (!bundles.size) {
      bundles.add(UNKNOWN)
    }

    bundles.forEach(bundle => {
      Object.keys(row.deps || {}).forEach(key => {
        this._addModule(bundle, row.deps[key])
      })
    })

    if (bundles.has(UNKNOWN)) {
      this._unknown.push(moduleID)
      bundles.delete(UNKNOWN)
    }

    next(null, row)
  }

  _flush(next) {
    // unknown modules should go to all bundles
    this._unknown.forEach(moduleID => {
      this._bundles.forEach(bundle => {
        this._addModule(bundle, moduleID)
      })
    })

    // bundle ID => Array(module ID)
    let map = new Map()
    this._bundles.forEach(bundle => {
      let modules = util.notEmptyValue(map, bundle)
      this._module2bundle.forEach(function (bundleSet, moduleID) {
        if (bundleSet.has(bundle)) {
          modules.add(moduleID)
        }
      })
    })

    this.emit('groups', map)

    next()
  }

  _addModule(bundle, moduleID) {
    util.notEmptyValue(this._module2bundle, moduleID).add(bundle)
  }

  createFilter(opts) {
    let basedir = this.basedir

    if (typeof opts === 'function') {
      opts = { output: opts }
    } else if (typeof opts === 'string' || Array.isArray(opts)) {
      opts = { filter: opts }
    }
    if (typeof opts !== 'object') {
      return function () {}
    }
    if (typeof opts.output === 'function') {
      return function (file) {
        let ret = opts.output(file)
        if (!ret) return
        ret = path.resolve(basedir, ret)
        // Make sure the returned path is always relative to basedir
        return path.relative(basedir, ret)
      }
    }

    let output = opts.output
    if (typeof output === 'string') {
      output = path.resolve(basedir, output)
    } else {
      output = null
    }
    let filterEntries = opts.filter
    if (typeof filterEntries !== 'function') {
      filterEntries = function (file) {
        if (!opts.filter) return true
        return multimatch([file, path.relative(basedir, file)], opts.filter).length
      }
    }
    return function (file) {
      if (filterEntries(file)) {
        return path.relative(basedir, output || file)
      }
    }
  }

}

module.exports = Groups
