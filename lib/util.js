'use strict'

exports.notEmptyValue = function (map, key, defaultValue) {
  if (!map.has(key)) {
    if (arguments.length < 3) {
      defaultValue = new Set()
    }
    map.set(key, defaultValue)
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


