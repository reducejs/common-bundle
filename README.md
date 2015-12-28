# common-bundle
[![version](https://img.shields.io/npm/v/common-bundle.svg)](https://www.npmjs.org/package/common-bundle)
[![status](https://travis-ci.org/zoubin/common-bundle.svg?branch=master)](https://travis-ci.org/zoubin/common-bundle)
[![coverage](https://img.shields.io/coveralls/zoubin/common-bundle.svg)](https://coveralls.io/github/zoubin/common-bundle)
[![dependencies](https://david-dm.org/zoubin/common-bundle.svg)](https://david-dm.org/zoubin/common-bundle)
[![devDependencies](https://david-dm.org/zoubin/common-bundle/dev-status.svg)](https://david-dm.org/zoubin/common-bundle#info=devDependencies)

A [`browserify`] plugin for packing modules into common shared bundles.

Features:
* Group one or more entries (modules) together to create a bundle.
* Extract common modules from bundles to create additional shared bundles.
* `b.bundle()` generates a stream flowing [`vinyl`] file objects.

## Example

**input**

```
⌘ tree example/src/
example/src/
├── node_modules
│   ├── color
│   │   └── index.js
│   └── say
│       └── index.js
└── page
    ├── green
    │   └── index.js
    ├── hello
    │   └── index.js
    ├── hi
    │   └── index.js
    └── red
        └── index.js

```

**Dependency graph**:

```
page/green/index.js -> node_modules/color/index.js
page/red/index.js -> node_modules/color/index.js
page/hi/index.js -> node_modules/say/index.js
page/hello/index.js -> node_modules/say/index.js

```

We can create one bundle for each page,
and another two bundles to be shared (
`color.js` for page `green` and `red`,
`say.js` for page `hi` and `hello`
).

```javascript
var browserify = require('browserify')
var vfs = require('vinyl-fs')
var del = require('del')
var glob = require('glob')
var path = require('path')

var basedir = path.resolve(__dirname, 'src')
var entries = glob.sync('page/**/index.js', { cwd: basedir })

var b = browserify(entries, { basedir: basedir })

b.plugin(require('common-bundle'), {
  groups: '**/page/**/index.js',
  common: [
    {
      output: 'color.js',
      filter: ['page/red/index.js', 'page/green/index.js'],
    },
    {
      output: 'say.js',
      filter: ['page/hi/index.js', 'page/hello/index.js'],
    },
  ],
})

var build = path.resolve(__dirname, 'build')
del.sync(build)
b.bundle().pipe(vfs.dest(build))


```

**output**:

```
⌘ tree example/build/
example/build/
├── color.js
├── page
│   ├── green
│   │   └── index.js
│   ├── hello
│   │   └── index.js
│   ├── hi
│   │   └── index.js
│   └── red
│       └── index.js
└── say.js

```

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

## Work with [`watchify`] and [`gulp`]

```javascript
var through = require('through2')

var b = browserify(entries, opts)
  .plugin('common-bundle', bundleOpts)

function bundle() {
  return b.bundle()

    .pipe(throug.obj(function (file, _, next) {
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
[`vinyl`]: https://github.com/gulpjs/vinyl
[`watchify`]: https://github.com/substack/watchify
[`gulp`]: https://github.com/gulpjs/gulp
[`multimatch`]: https://github.com/sindresorhus/multimatch

