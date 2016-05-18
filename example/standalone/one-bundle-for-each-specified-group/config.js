module.exports = {
  entries: ['a.js', 'b.js', 'd.js'],
  plugin: [
    // default options
    ['common-bundle', {
      factor: {
        // same with
        // groups: { 'a.js': 'a.js', 'b.js': 'b.js' },
        // or
        // groups: '+(a|b).js',
        groups: ['a.js', 'b.js'],
        common: 'common.js',
      },
    }],
  ],
}
