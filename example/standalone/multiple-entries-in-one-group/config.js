module.exports = {
  entries: ['a.js', 'b.js', 'd.js'],
  plugin: [
    // default options
    ['common-bundle', {
      factor: {
        groups: {
          'a.js': ['a.js', 'd.js'],
          'b.js': 'b.js',
        },
        common: 'common.js',
      },
    }],
  ],
}
