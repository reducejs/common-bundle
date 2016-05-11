'use strict'

const browserify = require('browserify')
const vfs = require('vinyl-fs')
const del = require('del')
const glob = require('glob')
const path = require('path')

const basedir = path.resolve(__dirname, 'src')
const entries = glob.sync('page/**/index.js', { cwd: basedir })
const b = browserify(entries, {
  basedir: basedir,
  cache: {},
  packageCache: {},
  paths: [path.resolve(__dirname, 'src', 'web_modules')],
})

b.plugin('common-bundle', {
  factor: function (input) {
    input.forEach(function (file) {
      this.add(file, file)
    }, this)
    this.addCommon('common-red-and-green.js', ['page/red/index.js', 'page/green/index.js'])
    this.addCommon('common-hello-and-hi.js', ['page/hi/index.js', 'page/hello/index.js'])
    this.addCommon('common.js', 'common-*.js')
  },
})

b.plugin('watchify2', { entryGlob: 'page/**/index.js' })

function bundle() {
  let build = path.resolve(__dirname, 'build')
  del.sync(build)
  b.bundle().pipe(vfs.dest(build))
}

b.on('update', bundle)

b.on('log', console.log.bind(console))

bundle()

