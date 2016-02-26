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
  common: [
    {
      output: 'common-red-and-green.js',
      filter: ['page/red/index.js', 'page/green/index.js'],
    },
    {
      output: 'common-hello-and-hi.js',
      filter: ['page/hi/index.js', 'page/hello/index.js'],
    },
  ],
})

del.sync(build)
b.bundle().pipe(vfs.dest(build))

