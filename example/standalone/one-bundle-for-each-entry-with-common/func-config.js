module.exports = {
  entries: ['a.js', 'b.js'],
  plugin: [
    // default options
    ['common-bundle', function (inputs) {
      inputs.forEach(function (entry) {
        this.add(entry, entry)
      }, this)
      this.addCommon('common.js', this.getBundles())
    }],
  ],
}
