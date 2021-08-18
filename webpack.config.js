'use strict';

const path = require('path');

const config = {
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

  entry: './src/js/PostProcessing.js', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'src/js'),
    filename: 'PostProcessing-build.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.js'],
  },
};
module.exports = config;

// module.exports = {
// 	mode: 'production',
// 	entry: `${__dirname}/src/post.js`,
// 	output: {
// 		path: `${__dirname}/src`,
// 		filename: 'built-post.js',
// 		libraryTarget: 'commonjs'
// 	},
// 	target: 'node'
// };
