import * as path from 'path'
import * as webpack from 'webpack'
import nodeExternals from 'webpack-node-externals'

const mode = process.env.NODE_ENV === "production" ? "production" : "development"
const devtool = mode === "production" ? 'eval-source-map' : 'source-map'
console.log("Using", mode, "mode for build.")

const config: webpack.Configuration = {
  mode,
  entry: './src/index.ts',
  devtool,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  node: {
    __dirname: false,
    __filename: false
  },
  externalsPresets: { node: true },
  externals: [nodeExternals() as any]
}

export default config
