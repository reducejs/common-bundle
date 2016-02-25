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

b.plugin(require('..'), {
  groups: '**/page/**/index.js',
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

b.plugin('watchify2', { entryGlob: 'page/**/index.js' })

function bundle() {
  let build = path.resolve(__dirname, 'build')
  del.sync(build)
  b.bundle().pipe(vfs.dest(build))
}

b.on('update', bundle)

b.on('log', console.log.bind(console))

bundle()

