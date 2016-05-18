module.exports = {
  entries: ['a.js', 'b.js'],
  plugin: [
    // default options
    ['common-bundle', { factor: { common: 'common.js' } }],
  ],
}
