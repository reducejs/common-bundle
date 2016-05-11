
module.exports = function (opts) {
  if (typeof opts === 'function') {
    return opts
  }

  if (typeof opts === 'string' || Array.isArray(opts)) {
    opts = { groups: opts }
  }

  opts = opts || {}

  return function (input) {
    if (typeof opts.groups === 'string' || Array.isArray(opts.groups)) {
      this.getModules(opts.groups).forEach(function (entry) {
        // one bundle for each entry
        this.add(entry, entry)
      }, this)
    } else if (opts.groups && typeof opts.groups === 'object') {
      Object.keys(opts.groups).forEach(function (output) {
        this.add(output, opts.groups[output], true)
      }, this)
    } else {
      input.forEach(function (entry) {
        this.add(entry, entry)
      }, this)
    }
    if (opts.common) {
      this.addCommon(
        opts.common, this.getBundles(), opts.threshold, false
      )
    }
  }
}

