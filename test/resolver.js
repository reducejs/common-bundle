var test = require('tap').test
var Resolver = require('../lib/resolver')

test('resolve', function (t) {
  var resolver = Resolver('/path/to/src')
  t.equal(
    resolver.resolve('a.js'),
    '/path/to/src/a.js',
    'relative'
  )
  t.equal(
    resolver.resolve('/path/to/build/a.js'),
    '/path/to/build/a.js',
    'absolute'
  )
  t.equal(
    resolver.resolve('*.js'),
    '/path/to/src/*.js',
    'star'
  )
  t.equal(
    resolver.resolve('**.js'),
    '**.js',
    'star star'
  )
  t.equal(
    resolver.resolve('!*.js'),
    '!/path/to/src/*.js',
    'negate star'
  )
  t.equal(
    resolver.resolve('!**.js'),
    '!**.js',
    'negate star star'
  )
  t.end()
})

test('relative', function (t) {
  var resolver = Resolver('/path/to/src')
  t.equal(
    resolver.relative('a.js'),
    'a.js',
    'relative'
  )
  t.equal(
    resolver.relative('/path/to/src/a.js'),
    'a.js',
    'absolute'
  )
  t.equal(
    resolver.relative('/path/to/build/a.js'),
    '../build/a.js',
    'absolute 2'
  )
  t.end()
})
