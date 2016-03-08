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
  paths: [path.resolve(__dirname, 'src', 'web_modules')],
})
const build = path.resolve(__dirname, 'build')

b.plugin(require('../..'), {
  groups: 'page/**/index.js',
  common: 'common.js',
})

del.sync(build)
b.on('common.map', function (bundleMap, inputMap) {
  console.log(JSON.stringify(bundleMap, null, 2))
  console.log(JSON.stringify(inputMap, null, 2))
})
b.bundle().pipe(vfs.dest(build))

