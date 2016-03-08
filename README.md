# common-bundle
[![version](https://img.shields.io/npm/v/common-bundle.svg)](https://www.npmjs.org/package/common-bundle)
[![status](https://travis-ci.org/reducejs/common-bundle.svg?branch=master)](https://travis-ci.org/reducejs/common-bundle)
[![coverage](https://img.shields.io/coveralls/reducejs/common-bundle.svg)](https://coveralls.io/github/reducejs/common-bundle)
[![dependencies](https://david-dm.org/reducejs/common-bundle.svg)](https://david-dm.org/reducejs/common-bundle)
[![devDependencies](https://david-dm.org/reducejs/common-bundle/dev-status.svg)](https://david-dm.org/reducejs/common-bundle#info=devDependencies)
![node](https://img.shields.io/node/v/common-bundle.svg)

A [`browserify`] plugin for packing modules into common shared bundles.

**Features**:

* Group one or more entries (modules) together to create a bundle.
* Extract common modules from bundles to create additional shared bundles.
* `b.bundle()` generates a stream flowing [`vinyl`] file objects.
* Work together with [`watchify2`] to re-bundle
  when entries are added and removed in the watching mode.
  See [example](example/multi/watch.js).

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
  groups: 'page/**/index.js',
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
  groups: 'page/**/index.js',

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
  groups: 'page/**/index.js',

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
This options is used to create original bundles.
It specifies a bundle should include which modules (with all their dependencies).

Type: `Array`

```javascript
[
  {
    output: function (file) {
      // bundle A.js should contain the matched modules
      if (/A/.test(file)) {
        return 'A.js'
      }
      // bundle B.js should contain the matched modules
      if (/B/.test(file)) {
        return 'B.js'
      }
      // bundle C.js should contain the matched modules
      if (/C/.test(file)) {
        return 'C.js'
      }
      // other modules will be included into all bundles created
    },
  },
]

```

Or:

```javascript
[
  {
    filter: 'A/index.js',
    output: 'A.js',
  },
  {
    filter: 'B/index.js',
    output: 'B.js',
  },
  {
    filter: 'C/index.js',
    output: 'C.js',
  },
]

```

**output**:

Type: `Function`

Receives the file path to a module,
and should return the file path of the target bundle.

If a falsy value returned,
the module will follow its dependents.
If it has no dependents,
then it go to all bundles created.

Type: `String`

Specify the file path of the bundle.

If not specified, the file path to the new bundle
is determined by `path.relative(basedir, moduleFile)`.

`basedir` can be specified by the [`basedir`](#basedir) option.

**filter**:

Specify how to match modules
that should be packed into the new bundle.

Type: `Function`

Receives the file path to a module.

If `true` returned,
that module will be packed into the new bundle.

Type: `String`, `Array`

Passed to [`multimatch`] to test module files.

#### common
The [`groups`](#groups) option specifies
how many bundles to be created,
as well as which modules each bundle should contain.
We call them original bundles.

The original bundles (or some of them)
may share a lot of common modules.
We can use the `common` option to create common bundles
containing the shared modules,
and remove them from the original bundles.

Type: `Object`

```js
// Modules shared by all original bundles go to `common.js`
b.plugin('common-bundle', {
  common: {
    // the file path to the new common bundle
    output: 'common.js',
    // the filter glob will be used to match original bundles
    filter: '**/*.js',
  },
})

```

If we mean to match all bundles created,
the `filter` can be omitted,
and the `common` option could be specified like:

```js
b.plugin('common-bundle', { common: 'common.js' })

```

Type: `Array`

Things may go crazy when the `common` option is specified as an array of common configurations.

```javascript
b.plugin('common-bundle', {
  // create original page-specific bundles
  // with path `page/**/index.js` for each page A, B, C, D
  groups: 'page/**/index.js',
  common: [
    {
      // new common bundle
      output: 'ab.js',
      // match against the four page-specific bundles
      filter: ['page/A/index.js', 'page/B/index.js'],
    },
    {
      // new common bundle
      output: 'cd.js',
      // match against the four page-specific bundles and `ab.js`
      filter: ['page/C/index.js', 'page/D/index.js'],
    },
    {
      // new common bundle
      output: 'common.js',
      // match against the four page-specific bundles,
      // `ab.js`, and `cd.js`
      filter: ['ab.js', 'cd.js'],
    },
  ],
})

```

The first configuration is processed the way above
to create a new common bundle.

However, when processing the second,
its `filter` will match against all the known bundles,
including the original bundles
and the common bundle created from the first configuration.

The same thing happens for the third configuration,
and so on and on.

Thus, common of common bundles could be possible,
like `common.js` in the example above.

What if two configurations share the same `output`?

```js
b.plugin('common-bundle', {
  groups: 'page/**/index.js',
  common: [
    {
      output: 'common.js',
      filter: ['page/A/index.js', 'page/B/index.js'],
    },
    {
      output: 'minor.js',
      filter: ['page/**/index.js', '!page/A/index.js', '!page/B/index.js'],
    },
    {
      // common.js has already been created
      output: 'common.js',
      // nothing happens to common.js
      // but modules in minor.js are removed if they are also in common.js
      filter: 'minor.js',
    },
  ],
})

```

**output**

Type: `String`

File path to the new bundle for sharing.

**filter**

Specify which bundles to share the new bundle.

Type: `Function`

Receives an array of bundle file paths (relative to [`basedir`](#basedir)),
and should return those to share the new bundle.

Type: `String`, `Array`

Passed to [`multimatch`] to determine bundles to share the new bundle.


**NOTE**
If there is only one single original bundle,
this option is ignored.

**NOTE**
If this option is specified as an array,
each element is processed one by one in the index order.

So, the `filter` can use common bundles created before,
which means we can create a common bundle from existing common bundles.

```js
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
    {
      // abc.js will contain modules shared by ab.js, bc.js and ac.js
      output: 'abc.js',
      filter: ['ab.js', 'bc.js', 'ac.js'],
    },
  ],
})

```

If `output` is specified as an existing bundle,
bundles matched by `filter` will be made dependent upon it,
and modules are removed if present already in `output`.

```js
b.plugin('common-bundle', {
  common: [
    {
      output: 'bundle.js',
      filter: ['page/A/index.js', 'page/B/index.js'],
    },
    {
      output: 'component.js',
      filter: 'component/**/index.js',
    },
    {
      // Now we can load component.js asynchronously in A, and B,
      // with no component loaded twice.
      output: 'bundle.js',
      filter: 'component.js',
    },
  ],
})

```


#### basedir
Specify how to name the bundles created.

See the [`groups`](#groups) options for more information.

Type: `String`

### Events

#### b.on('common.map', (bundleMap, inputMap) => {})

Suppose there are two pages, `hi` and `hello`,
both depend upon `lodash` and `say`.

We can use the following options to create a `common.js`,
and check `bundleMap` and `inputMap`.

```js
b.plugin(require('../..'), {
  groups: 'page/**/index.js',
  common: 'common.js',
})
b.on('common.map', function (bundleMap, inputMap) {
  console.log(JSON.stringify(bundleMap, null, 2))
  console.log(JSON.stringify(inputMap, null, 2))
})

```

**bundleMap**

```js
{
  // bundle => {}
  "page/hi/index.js": {
    "modules": [
      // modules in this bundle
      "page/hi/index.js"
    ],
    "deps": [
      // bundles should come before this bundle
      "common.js"
    ]
  },
  "page/hello/index.js": {
    "modules": [
      "page/hello/index.js"
    ],
    "deps": [
      "common.js"
    ]
  },
  "common.js": {
    "modules": [
      "node_modules/lodash/index.js",
      "web_modules/say/index.js"
    ]
  }
}

```

**inputMap**

```js
{
  // input file => [bundles]
  "page/hello/index.js": [
    "page/hello/index.js"
  ],
  "page/hi/index.js": [
    "page/hi/index.js"
  ]
}

```

#### b.on('common.pipeline', (id, pipeline) => {})

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
[`watchify2`]: https://github.com/reducejs/watchify2
[`gulp`]: https://github.com/gulpjs/gulp
[`multimatch`]: https://github.com/sindresorhus/multimatch

