'use strict'

exports.notEmptyValue = function (map, key) {
  if (!map.has(key)) {
    map.set(key, new Set())
  }
  return map.get(key)
}

exports.toArray = function (iterable) {
  let arr = []
  for (var e of iterable) {
    arr.push(e)
  }
  return arr
}

exports.intersection = function (sets) {
  let counts = {}
  let len = sets.length
  let ret = new Set()
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

