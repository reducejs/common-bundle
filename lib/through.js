var stream = require('stream')

exports.obj = function (write, end) {
  var ret = stream.Transform({ objectMode: true })
  ret._transform = write || function (c, _, next) {
    next(null, c)
  }
  ret._flush = end
  return ret
}
