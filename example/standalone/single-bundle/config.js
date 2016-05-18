module.exports = {
  entries: ['a.js', 'b.js'],
  plugin: [
    // same with
    // ['common-bundle', { factor: 'bundle.js' }],
    ['common-bundle', 'bundle.js'],
  ],
}
