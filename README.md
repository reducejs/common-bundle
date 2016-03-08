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
  // Pack each index.js and their dependencies into one bundle
  // (with a path like page/**/index.js)
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
  groups: 'page/**/index.js',

  common: {
    // create a common bundle for all bundles
    // whose path matches **/*.js
    output: 'common.js',
    filter: '**/*.js',
  },
})
 
var vfs = require('vinyl-fs')
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
Specify some entries and create a bundle for containing them and their dependencies.

##### typeof options.groups === 'object'

* `options.groups.output`

Specify the path to the new bundle

Type: `String`

`output` should be a path relative to the final build directory.

```js
{
  // entries with a pattern like page/**/index.js will be packed into bundle.js
  output: 'bundle.js',
  filter: 'page/**/index.js',
}

```

Type: `Function`

`filter` is ignored.
`output` will be called with each module file path,
and the returned value (if there is any) is used as the file path to the new bundle.

```js
{
  output: function (file) {
    if (file.endsWith('/page/A/index.js')) {
      return 'page/A/index.js'
    }
    if (file.endsWith('/page/B/index.js')) {
      return 'page/B/index.js'
    }
  },
}

```

Type: `Falsy`

If `options.groups.filter` says that the given module should go to a new bundle,
`path.relative(basedir, moduleFile)` is used as the file path to the new bundle.

* `options.groups.filter`

Specify the the entries that should go to the new bundle

Type: `String`, `Array`

Passed to [`multimatch`] to test module files.

Relative patterns will be resolved to absolute paths from [basedir](#basedir).

Type: `Function`

Called with each module file path.
If `true` returned, that module will be packed into the new bundle.

##### typeof options.groups === 'string'
`b.plugin('common-bundle', { groups: pattern })` is equivalent to 
`b.plugin('common-bundle', { groups: { filter: pattern } })`.

##### typeof options.groups === 'function'
`b.plugin('common-bundle', { groups: fn })` is equivalent to 
`b.plugin('common-bundle', { groups: { output: fn } })`.

##### Array.isArray(options.groups) === true
Each element is processed as a `groups` option.

```javascript
[
  {
    output: 'page/A/index.js',
    filter: 'page/A/index.js',
  },
  {
    output: 'page/B/index.js',
    filter: 'page/B/index.js',
  },
]

```

#### common
After processing `options.groups`, some bundles have been created,
which are called original bundles.

The original bundles (or some of them)
may share a lot of common modules.
We can use `options.common` to create common bundles
containing the shared modules,
and remove them from the original bundles.

**NOTE**
If there is only one single original bundle,
this option is ignored.

##### typeof options.common === 'object'

* `options.common.output`

Specify the file path to the new common bundle.

Type: `String`

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

* `options.common.filter`

Specify which group of bundles should share the new common bundle.

Type: `String`, `Array`

Passed to [`multimatch`] to test bundle files.

Type: `Function`

Receives all the bundles created yet,
and should return an array of some of them.

Type: *otherwise*

The new common bundle is shared by all bundles created yet.

```js
b.plugin('common-bundle', { common: 'common.js' })

```

##### Array.isArray(options.common) === true
Each element is treated as an `options.common` to create bundles.

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

#### basedir
Specify the base for relative paths to bundles and module files.

Type: `String`

Default: `b._options.basedir`

### Events

#### b.on('common.map', (bundleMap, inputMap) => {})

Suppose there are two pages, `hi` and `hello`,
and both depend upon `lodash` and `say`.

We can use the following options to create a `common.js`,
and check `bundleMap` and `inputMap`.

```js
b.plugin('common-bundle', {
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

## Work with [`watchify2`] and [`gulp`]

```javascript
var through = require('through2')
var browserify = require('browserify')

gulp.task('build', function() {
  var b = browserify({ basedir: '/path/to/src' })
  b.plugin('common-bundle', {
    // page-specific bundles
    groups: 'page/**/index.js',
    // common bundle shared by all pages
    common: 'common.js',
  })

  return gulp.src('page/**/index.js', {
    cwd: b._options.basedir,
    read: false,
  })
  .pipe(through.obj(function (file, _, next) {
    b.add(file.path)
    next()
  }, function (next) {
    b.bundle()
      .on('data', file => this.push(file))
      .on('end', () => this.push(null))
  }))
  .pipe(gulp.dest('build'))
})

gulp.task('watch', function (cb) {
  var b = browserify({ basedir: '/path/to/src' })
  b.plugin('common-bundle', {
    // page-specific bundles
    groups: 'page/**/index.js',
    // common bundle shared by all pages
    common: 'common.js',
  })

  b.plugin('watchify2', {
    // now we can add or remove page entries
    // and that would cause `b.bundle()` to be executed.
    entryGlob: 'page/**/index.js',
  })
  gulp.src('page/**/index.js', {
    cwd: b._options.basedir,
    read: false,
  })
  .pipe(through.obj(function (file, _, next) {
    b.add(file.path)
    next()
  }, function (next) {
    b.on('update', bundle)
    bundle()
  }))

  function bundle() {
    b.bundle().pipe(gulp.dest('build'))
      .on('data', file => console.log('bundle:', file.relative))
      .on('end', () => console.log('-'.repeat(40)))
  }
})

```

[`browserify`]: https://github.com/substack/node-browserify
[`factor-bundle`]: https://github.com/substack/factor-bundle
[`vinyl`]: https://github.com/gulpjs/vinyl
[`watchify`]: https://github.com/substack/watchify
[`watchify2`]: https://github.com/reducejs/watchify2
[`gulp`]: https://github.com/gulpjs/gulp
[`multimatch`]: https://github.com/sindresorhus/multimatch

