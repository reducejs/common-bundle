'use strict'

exports.notEmptyValue = function (map, key) {
  if (!map.has(key)) {
    map.set(key, new Set())
  }
  return map.get(key)
}

exports.toArray = function (iterable) {
  var arr = []
  for (let e of iterable) {
    arr.push(e)
  }
  return arr
}

exports.intersection = function (sets) {
  var counts = {}
  var len = sets.length
  var ret = new Set()
  sets.forEach(function (set) {
    set.forEach(function (e) {
      counts[e] = counts[e] || 0
      if (++counts[e] === len) {
        ret.add(e)
      }
    })
  })
  return ret
}

