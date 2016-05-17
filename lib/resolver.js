var path = require('path')

var RESOLVE_CACHE = {}
var RELATIVE_CACHE = {}

module.exports = function (basedir) {
  if (!basedir) {
    return { resolve: identity, relative: identity, basedir: basedir }
  }

  var rslCache = RESOLVE_CACHE[basedir] = RESOLVE_CACHE[basedir] || {}
  var relCache = RELATIVE_CACHE[basedir] = RELATIVE_CACHE[basedir] || {}

  return {
    basedir: basedir,
    resolve: function (glob) {
      if (rslCache[glob]) {
        return rslCache[glob]
      }
      var prefix = ''
      if (startsWith(glob, '!')) {
        prefix = '!'
        glob = glob.slice(1)
      }
      if (!path.isAbsolute(glob) && !startsWith(glob, '**')) {
        glob = path.resolve(basedir, glob)
      }

      rslCache[glob] = prefix + glob
      return rslCache[glob]
    },
    relative: function (p) {
      if (relCache[p]) {
        return relCache[p]
      }
      if (path.isAbsolute(p)) {
        relCache[p] = path.relative(basedir, p)
      } else {
        relCache[p] = p
      }
      return relCache[p]
    },
  }
}

function identity(x) {
  return x
}

function startsWith(source, prefix) {
  return source.substring(0, prefix.length) === prefix
}

