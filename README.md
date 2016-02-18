# common-bundle
[![version](https://img.shields.io/npm/v/common-bundle.svg)](https://www.npmjs.org/package/common-bundle)
[![status](https://travis-ci.org/reducejs/common-bundle.svg?branch=master)](https://travis-ci.org/reducejs/common-bundle)
[![coverage](https://img.shields.io/coveralls/reducejs/common-bundle.svg)](https://coveralls.io/github/reducejs/common-bundle)
[![dependencies](https://david-dm.org/reducejs/common-bundle.svg)](https://david-dm.org/reducejs/common-bundle)
[![devDependencies](https://david-dm.org/reducejs/common-bundle/dev-status.svg)](https://david-dm.org/reducejs/common-bundle#info=devDependencies)

A [`browserify`] plugin for packing modules into common shared bundles.

**Features**:

* Group one or more entries (modules) together to create a bundle.
* Extract common modules from bundles to create additional shared bundles.
* `b.bundle()` generates a stream flowing [`vinyl`] file objects.

## Example

**input**:

![input](example/images/input.png)

### One bundle for each page

```javascript
var browserify = require('browserify')
var glob = require('glob')
 
var basedir = '/path/to/src'
var entries = glob.sync('page/**/index.js', { cwd: basedir })
var b = browserify(entries, { basedir: basedir })
 
b.plugin('common-bundle', {
  // Each index.js packed into a new bundle
  // with path page/**/index.js
  groups: '**/page/**/index.js',
})
 
var vfs = require('vinyl-fs')
// Write all bundles to the build directory
b.bundle().pipe(vfs.dest('/path/to/build'))

```

**output**:

![one-bundle-for-each-page](example/images/no-common.png)

### One additional bundle shared by all page-specific bundles

```javascript
var browserify = require('browserify')
var glob = require('glob')
 
var basedir = '/path/to/src'
var entries = glob.sync('page/**/index.js', { cwd: basedir })
var b = browserify(entries, { basedir: basedir })
 
b.plugin('common-bundle', {
  // Each index.js packed into a new bundle with path page/**/index.js
  groups: '**/page/**/index.js',

  common: {
    output: 'common.js',
    filter: '**/*.js',
  },
})
 
var vfs = require('vinyl-fs')
// Write all bundles to the build directory
b.bundle().pipe(vfs.dest('/path/to/build'))

```

**output**:

![one-common](example/images/one-common.png)

#### [`factor-bundle`]
The default output of [`factor-bundle`] would be:

![factor-bundle](example/images/factor-bundle.png)

**NOTE**:
[`factor-bundle`] may pack modules, that are not needed by some pages, into the common bundle. `common-bundle` will try to make sure every page load only necessary modules.

### Shared bundle for each group of page-specific bundles

```javascript
var browserify = require('browserify')
var glob = require('glob')
 
var basedir = '/path/to/src'
var entries = glob.sync('page/**/index.js', { cwd: basedir })
var b = browserify(entries, { basedir: basedir })
 
b.plugin('common-bundle', {
  // Each index.js packed into a new bundle with path page/**/index.js
  groups: '**/page/**/index.js',

  common: [
    {
      output: 'common-hello-and-hi.js',
      filter: ['page/hello/index.js', 'page/hi/index.js']
    },
    {
      output: 'common-red-and-green.js',
      filter: ['page/red/index.js', 'page/green/index.js']
    },
  ],
})
 
var vfs = require('vinyl-fs')
// Write all bundles to the build directory
b.bundle().pipe(vfs.dest('/path/to/build'))

```

**output**:

![multiple-commons](example/images/multiple-commons.png)

## Usage

```javascript
var browserify = require('browserify')

var b = browserify(entries, bopts)

b.plugin('common-bundle', options)

```

### options

#### groups
This options is used to create original bundles,
which will can be used to generate additional shared modules
later through the [`common`](#common) option.

Specify which modules (and all of their dependencies)
to be packed together into which bundle.

Type: `Array`

```javascript
[
  {
    output: function (file) {
      if (/A/.test(file)) {
        return 'A.js'
      }
      if (/B/.test(file)) {
        return 'B.js'
      }
      if (/C/.test(file)) {
        return 'C.js'
      }
    },
  },
]

```

Or:

```javascript
[
  {
    filter: '**/A/index.js',
    output: 'A.js',
  },
  {
    filter: '**/B/index.js',
    output: 'B.js',
  },
  {
    filter: '**/C/index.js',
    output: 'C.js',
  },
]

```

**output**:

Type: `Function`

Receives the file path to a module,
and should return the file path of the bundle
which should contain that module.

If a falsy value returned,
the module will appear either in all bundles
or bundles containing its dependents.

Type: `String`

Specify the file path of the bundle to be created.

Type: `Falsy`

The file path to the new bundle is determined by the result of `path.relative(basedir, file)`.

`basedir` can be specified by [`basedir`](#basedir).

**filter**:

Specify how to match modules
that should be packed into the new bundle.

Type: `Function`

Receives the file path to a module.

If `true` returned, that module will be packed into this bundle.

Type: `String`, `Array`

Passed to [`multimatch`] to test module files.

#### common
This options is used to create bundles for sharing
among those created through the [`groups`](#groups) option.

Type: `Array`

Examples:

```javascript
// Pack modules shared by all original bundles into `common.js`
b.plugin('common-bundle', {
  common: {
    output: 'common.js',
    filter: '**/*.js',
  },
})

b.plugin('common-bundle', {
  common: [
    {
      output: 'ab.js',
      filter: ['page/A/index.js', 'page/B/index.js'],
    },
    {
      output: 'bc.js',
      filter: ['page/C/index.js', 'page/B/index.js'],
    },
    {
      output: 'ac.js',
      filter: ['page/A/index.js', 'page/C/index.js'],
    },
  ],
})

```

**output**:

Type: `String`

File path to the new bundle for sharing.

**filter**:

Specify which bundles to share the new bundle.

Type: `Function`

Receives an array of bundle file paths,
and should return those to share the new bundle.

Type: `String`, `Array`

Passed to [`multimatch`] to determine bundles to share the new bundle.


#### basedir
Specify how to name the bundles created.

See the [`groups`](#groups) options for more information.

Type: `String`

### Events

#### b.on('common.pipeline', function (id, pipeline) {})

Every time a bundle created, a `common.pipeline` event is emitted with its `id` and the packing `pipeline`.

A `pipeline` is a [labeled-stream-splicer](https://npmjs.org/package/labeled-stream-splicer):

* `'pack'` - [browser-pack](https://npmjs.org/package/browser-pack)
* `'wrap'` - apply final wrapping

You can call `pipeline.get` with a label name to get a handle on a stream pipeline that you can `push()`, `unshift()`, or `splice()` to insert your own transform streams.

Event handlers must be attached *before* calling `b.plugin`.

## Work with [`watchify`] and [`gulp`]

```javascript
var through = require('through2')

var b = browserify(entries, opts)
  .plugin('common-bundle', bundleOpts)

function bundle() {
  return b.bundle()

    .pipe(through.obj(function (file, _, next) {
      // Log bundles created
      b.emit('log', file.relative)
      next(null, file)
    }))

    // maybe `vinyl-buffer` is needed to apply
    // more gulp plugins here

    .pipe(gulp.dest('build'))
}

gulp.task('build', bundle)

gulp.task('watch', function () {
  b.plugin('watchify')
  b.on('update', bundle)
  bundle()
})

```

[`browserify`]: https://github.com/substack/node-browserify
[`factor-bundle`]: https://github.com/substack/factor-bundle
[`vinyl`]: https://github.com/gulpjs/vinyl
[`watchify`]: https://github.com/substack/watchify
[`gulp`]: https://github.com/gulpjs/gulp
[`multimatch`]: https://github.com/sindresorhus/multimatch

