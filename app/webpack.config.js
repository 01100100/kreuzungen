const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: './dist',
    historyApiFallback: {
      rewrites: [
        { from: /^\/globe/, to: '/globe.html' },
        { from: /./, to: '/index.html' },
      ],
    },
  },
  entry: {
    main: './src/main.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: [/node_modules/, /\.test\.ts$/],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
        exclude: /input\.css$/,
      },
      {
        test: /\.md$/,
        use: [
          {
            loader: 'html-loader',
            options: {
              esModule: false,
            },
          },
          {
            loader: 'markdown-loader',
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  node: { global: true },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      chunks: ['main'],
      favicon: './src/assets/favicon.ico',
      inject: true,
    }),
    new HtmlWebpackPlugin({
      template: './src/globe.html',
      filename: 'globe.html',
      chunks: [], // No specific chunks for globe.html
      inject: true,
    }),
    new CopyPlugin({
      patterns: [
        { from: 'src/routes.json', to: 'routes.json' },
        'src/assets/analytics.js'
      ],
    }),
  ],
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};