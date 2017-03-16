const path = require('path')

module.exports = {
  entry: './browser.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'machinomy.bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: 'babel-loader'
      }
    ]
  },
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  }
}
