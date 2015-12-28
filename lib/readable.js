var Readable = require('stream').Readable
var noop = function () {}

module.exports = function () {
  var s = new Readable({ objectMode: true })
  s._read = noop
  return s
}
