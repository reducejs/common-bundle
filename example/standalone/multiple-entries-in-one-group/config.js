module.exports = {
  entries: ['a.js', 'b.js', 'd.js'],
  plugin: [
    // default options
    ['common-bundle', {
      groups: {
        'a.js': ['a.js', 'd.js'],
        'b.js': 'b.js',
      },
      common: 'common.js',
    }],
  ],
}
