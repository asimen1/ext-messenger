/* eslint-env node, node */

const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');

var plugins = [new CleanWebpackPlugin(['dist'])];

var env = process.env.WEBPACK_ENV;
if (env === 'build') {
    plugins.push(new webpack.optimize.UglifyJsPlugin({
        minimize: true
    }));
}

var config = {
    devtool: 'source-map',

    entry: __dirname + '/src/messenger.js',

    output: {
        path: __dirname + '/dist',
        filename: 'chrome-ext-messenger.min.js',
        library: 'chrome-ext-messenger',
        libraryTarget: 'umd',
        umdNamedDefine: true
    },

    plugins: plugins,

    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        }]
    }
};

module.exports = config;
