
module.exports = function (opts) {
  if (typeof opts === 'function') {
    return opts
  }

  if (typeof opts === 'string') {
    return function (inputs) {
      // single bundle
      this.add(opts, inputs, false)
    }
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
        this.add(output, this.getModules(opts.groups[output]), true)
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

