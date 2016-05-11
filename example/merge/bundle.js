'use strict'

const browserify = require('browserify')
const vfs = require('vinyl-fs')
const del = require('del')
const glob = require('glob')
const path = require('path')

const basedir = path.resolve(__dirname, 'src')
const b = browserify(['./a.js', './b.js', './c.js'], { basedir: basedir })
const build = path.resolve(__dirname, 'build')

b.plugin('common-bundle', {
  factor: function (input) {
    input.forEach(function (entry) {
      this.add(entry, entry)
    }, this)

    // create ab.js to contain modules shared by bundle **/a.js and bundle **/b.js
    this.addCommon('ab.js', '+(a|b).js')
    // create ac.js to contain modules shared by bundle **/a.js and bundle **/c.js
    this.addCommon('ac.js', '+(a|c).js')
    // create bc.js to contain modules shared by bundle **/b.js and bundle **/c.js
    this.addCommon('bc.js', '+(b|c).js')
  },
})

del.sync(build)
b.bundle()
  .pipe(vfs.dest(build))
  .on('data', file => {
    console.log(file.relative)
  })

