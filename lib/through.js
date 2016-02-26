'use strict'

const stream = require('stream')

exports.obj = function (write, end) {
  return stream.Transform({
    objectMode: true,
    transform: write || function (c, _, next) { next(null, c) },
    flush: end,
  })
}
