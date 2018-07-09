var ExtractTextPlugin = require("extract-text-webpack-plugin");
const webpack = require('webpack'); //to access built-in plugins


require('dotenv').config();

module.exports = {
  context: __dirname,
  entry: {
    client_main: './client/app-client.js',
    css: './client/styles/sassStyles.scss'
  },
  output: {
    filename: "[name].js",
    path: __dirname + "/dist",
  },
  devtool: 'eval-source-maps',
  plugins: [
    new ExtractTextPlugin({
      filename: 'style.css',
      allChunks: true
    }),
    new webpack.DefinePlugin({
      HOST_DOMAIN: JSON.stringify(process.env.HOST_DOMAIN),
      WEBSOCKET_DOMAIN: JSON.stringify(process.env.WEBSOCKET_DOMAIN)
    })
  ],

  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  module: {
  	rules: [
  	  {
  	    test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
  	         loader: "babel-loader"
          }
        ]
  	  },
      {
        test: /\.scss$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'sass-loader']
        })
      }
    ]
  }
}