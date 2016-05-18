# common-bundle
[![version](https://img.shields.io/npm/v/common-bundle.svg)](https://www.npmjs.org/package/common-bundle)
[![status](https://travis-ci.org/reducejs/common-bundle.svg?branch=master)](https://travis-ci.org/reducejs/common-bundle)
[![coverage](https://img.shields.io/coveralls/reducejs/common-bundle.svg)](https://coveralls.io/github/reducejs/common-bundle)
[![dependencies](https://david-dm.org/reducejs/common-bundle.svg)](https://david-dm.org/reducejs/common-bundle)
[![devDependencies](https://david-dm.org/reducejs/common-bundle/dev-status.svg)](https://david-dm.org/reducejs/common-bundle#info=devDependencies)
![node](https://img.shields.io/node/v/common-bundle.svg)

A [browserify] plugin for packing modules into common shared bundles.

**Features**:

* Powerful control on creating bundles
* `b.bundle()` generates a stream flowing [vinyl] file objects.

## Example

```javascript
var browserify = require('browserify')
var glob = require('glob')
 
var basedir = '/path/to/src'
var entries = glob.sync('page/**/index.js', { cwd: basedir })
var b = browserify(entries, { basedir: basedir })
 
b.plugin('common-bundle', {
  // Pack each index.js and their dependencies into a new bundle
  // e.g. '/path/to/src/page/hi/index.js' => 'page/hi/index.js'
  groups: 'page/**/index.js',
  // create an additional bundle to hold common moudles shared by all other bundles
  common: 'common.js',
})
 
var vfs = require('vinyl-fs')
// Write all bundles to the build directory
// e.g. 'page/hi/index.js' => '/path/to/build/page/hi/index.js'
b.bundle().pipe(vfs.dest('/path/to/build'))

```

Or
```javascript
var browserify = require('browserify')
var glob = require('glob')
 
var basedir = '/path/to/src'
var entries = glob.sync('page/**/index.js', { cwd: basedir })
var b = browserify(entries, { basedir: basedir })
 
b.plugin('common-bundle', function (entries) { 
  entries.forEach(function (file) { 
    // create a new bundle
    this.add(
      file,   // path of the new bundle
      file    // modules (and their dependencies) to hold
    )
  }, this)

  // create a new bundle for sharing modules
  this.addCommon( 
    'common.js',  // name of the common bundle
    'page/**/index.js'  // bundles to share the common bundle
  )
})
 
var vfs = require('vinyl-fs')
// Write all bundles to the build directory
// e.g. 'page/hi/index.js' => '/path/to/build/page/hi/index.js'
b.bundle().pipe(vfs.dest('/path/to/build'))

```

## options
`options` can be specified in three ways:

- `String`. Pack all modules into a single bundle.
- `Object`. Creating bundles according to the `groups` and `common` field. *Default*
- `Function`. Creating bundles manually.

### `groups` and `common`
`options.groups` is used to create bundles for holding specified modules.

```js
{ 
  // two bundles will be created
  // one is 'a.js', to hold the module 'a.js'
  // the other is 'b.js', to hold the module 'b.js'
  groups: ['a.js', 'b.js'],
}

```

To specify paths (rather than the default) for the created bundles:
```js
{ 
  // two bundles will be created
  // one is 'bundle-a.js', to hold the module 'a.js'
  // the other is 'bundle-b.js', to hold the module 'b.js'
  groups: { 
    'bundle-a.js': 'a.js',
    'bundle-b.js': 'b.js',
  },
}

```

If `options.groups` is omitted, it defaults to the entries input to the bundler.
```js
var browserify = require('browserify')
var entries = ['a.js', 'b.js']
var b = browserify(entries, { basedir: '/path/to/src' })

b.plugin('common-bundle')
// the same with
// b.plugin('common-bundle', { groups: entries })

```

Patterns are also accepted:
```js
{
  groups: 'page/**/index.js'
}

```

It is the same with:
```js
{
  groups: modulesMatched
}

```

`modulesMatched` is the result of matching the given pattern against all modules.
Refer to [multimatch] for more information about the pattern.

`options.common` allow you to create a bundle for holding common modules shared by all other bundles.
```js
{
  // one bundle for each entry
  // an additional bundle for holding modules shared by all entry bundles
  common: 'common.js'
}

```


### manual control on the process of creating bundles
If `options` is specified as a function,
it will be called as a method of the [`BundleFactory`](#bundlefactory).

```js
// receives the original entries
function (entries) {
  entries.forEach(function (file) { 
    // create a new bundle
    this.add(
      file,   // path of the new bundle
      file    // modules (and their dependencies) to hold
    )
  }, this)

  // create a new bundle for sharing modules
  this.addCommon( 
    'common.js',  // name of the common bundle
    this.getBundles()  // bundles to share the common bundle
  )
}

```

### BundleFactory
A `BundleFactory` instance provides some methods to create bundles.

#### add

Signature: `add(bundlePath, modulesToHold)`

Create a new bundle with the path of `bundlePath`.
All modules specified by `modulesToHold` and their dependencies will go to this bundle.

If `bundlePath` already exists, modules are just added to it.

`modulesToHold` should be paths to modules.
You can use the `getModules` or `select` method to pick some specific modules in some cases.

#### getModules

Signature: `getModules(patterns)`

Pick some modules from the whole module set.

`patterns` should be accptable by [multimatch]


#### getBundles

Signature: `getBundles(patterns)`

Pick some bundles from the whole bundle set.

`patterns` should be accptable by [multimatch]


#### select

Signature: `select(bundles, threshold, hasMagic)`

Select modules from some bundles according to `threshold`.

If you are specifying patterns for the bundles,
the third argument should be `true`.

`threshold` could be `Number`,
which means modules are picked only when they are shared by more than the specific amount of bundles.
By default, the picked modules are those shared by all bundles.

If `threshold` is specified as a function,
it should respect the following signature:

`isPicked = threshold(row, groups)`

`row` is the module representation object.
You can access the module path by `row.file`.

`groups` is an array of bundles holding `row`.

```js
// get all bundles
var targetBundles = this.getBundles()
this.select(
  targetBundles,
  function (row, groups) {
    // pick row when more than half bundles holding it
    return groups.length * 2 > targetBundles
  }
)

```

#### addCommon

Signature: `addCommon(commonBundlePath, bundlesToShare, threshold)`

Pick some modules by calling `this.select(bundlesToShare, threshold)`,
and create a bundle with the path of `commonBundlePath` to hold them.

Moreover, the picked modules will be removed from each bundle in `bundlesToShare`.


## Events

### b.on('common.map', (o) => {})
Suppose there are two entries `a.js` and `b.js`, and they both `require('./c')`.

We use the default options to create two bundles holding `a.js` and `b.js` respectively.

Then `o` will look like:

```js
{
  "bundles": {
    // bundle path => { modules: [module id], deps: [bundle path] }
    "a.js": {
      "modules": [ 3, 1 ],
      "deps": []
    },
    "b.js": {
      "modules": [ 3, 2 ],
      "deps": []
    }
  },
  "modules": {
    // module id => { file: module path, bundles: [ [bundles] ] }
    "1": {
      "file": "a.js",
      "bundles": [
        [ "a.js" ]
      ]
    },
    "2": {
      "file": "b.js",
      "bundles": [
        [ "b.js" ]
      ]
    },
    "3": {
      "file": "c.js",
      "bundles": [
        // load this group of bundles to make c.js available
        [ "a.js" ],
        // or load this group
        [ "b.js" ]
      ]
    }
  },
  "entries": [ 1, 2 ],
  "basedir": "/path/to/src"
}

```

### b.on('common.pipeline', (id, pipeline) => {})

Every time a bundle created, a `common.pipeline` event is emitted with its `id` and the packing `pipeline`.

A `pipeline` is a [labeled-stream-splicer](https://npmjs.org/package/labeled-stream-splicer):

* `'pack'` - [browser-pack](https://npmjs.org/package/browser-pack)
* `'wrap'` - apply final wrapping

You can call `pipeline.get` with a label name to get a handle on a stream pipeline that you can `push()`, `unshift()`, or `splice()` to insert your own transform streams.

Event handlers must be attached *before* calling `b.plugin`.

## Work with [gulp]

```js
var gulp = require('gulp')
var browserify = require('browserify')
var del = require('del')
var glob = require('globby')
var path = require('path')

gulp.task('build', function () {
  del.sync('build')
  return createBundler().bundle().pipe(gulp.dest('build'))
})

gulp.task('watch', function (cb) {
  var b = createBundler()
    .plugin('watchify2', { entryGlob: 'page/**/index.js' })
    .on('close', cb)
    .on('update', bundle)
  function bundle() {
    del.sync('build')
    b.bundle().pipe(gulp.dest('build'))
  }
  bundle()
})

function createBundler() {
  var basedir = path.resolve(__dirname, 'src')
  var entries = glob.sync('page/**/index.js', { cwd: basedir })
  var b = browserify(entries, { basedir: basedir })
  b.plugin('common-bundle', {
    groups: 'page/**/index.js',
    common: 'common.js',
  })
  b.on('common.map', function (o) {
    console.log(
      'bundles:', Object.keys(o.bundles).length,
      'modules:', Object.keys(o.modules).length,
      'entries:', Object.keys(o.entries).length
    )
  })
  return b
}


```

[browserify]: https://github.com/substack/node-browserify
[vinyl]: https://github.com/gulpjs/vinyl
[gulp]: https://github.com/gulpjs/gulp
[multimatch]: https://github.com/sindresorhus/multimatch

