/* eslint-env node */

const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
    let mode = argv.mode ?? 'production';

    return {
        mode: mode,

        // NOTE: This is important to create a CSP compliant output that doesn't use eval and
        // NOTE: therefore doesn't require "unsafe-eval" policy declaration in the manifest.json.
        devtool: 'source-map',

        entry: path.join(__dirname, 'src', 'messenger.js'),

        output: {
            path: path.join(__dirname, 'dist'),
            filename: 'ext-messenger.min.js',
            library: 'ext-messenger',
            libraryTarget: 'umd',
            umdNamedDefine: true,
        },

        plugins: [
            new CleanWebpackPlugin(),
        ],
    };
};