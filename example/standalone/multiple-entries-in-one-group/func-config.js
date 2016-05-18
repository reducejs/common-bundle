module.exports = {
  entries: ['a.js', 'b.js', 'd.js'],
  plugin: [
    // default options
    ['common-bundle', {
      factor: function () {
        this.add('a.js', ['a.js', 'd.js'])
        this.add('b.js', 'b.js')

        // same with
        // this.addCommon('common.js', ['a.js', 'b.js'])
        this.addCommon('common.js', '*.js')
      },
    }],
  ],
}
