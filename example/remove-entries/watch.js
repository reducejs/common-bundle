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
  factor: {
    groups: '**/page/**/index.js',
    common: 'common.js',
  },
})

b.plugin('watchify2', { entryGlob: 'page/**/index.js' })


var build = path.resolve(__dirname, 'build')
function bundle() {
  b.on('common.map', m => { b._map = m })
  if (b._map) {
    let map = b._map
    b._map = null
    del(Object.keys(map).map(f => path.resolve(build, f)))
      .then(_bundle)
  } else {
    _bundle()
  }

  function _bundle() {
    b.bundle().pipe(vfs.dest(build))
  }
}

b.on('update', bundle)

b.on('log', console.log.bind(console))

del(build)
bundle()

