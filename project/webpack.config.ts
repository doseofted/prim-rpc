import * as path from 'path'
import * as webpack from 'webpack'
import nodeExternals from 'webpack-node-externals'

const mode = process.env.NODE_ENV === "production" ? "production" : "development"
const config: webpack.Configuration = {
  mode,
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
  },
  externalsPresets: { node: true },
  externals: [nodeExternals() as any]
}

export default config
