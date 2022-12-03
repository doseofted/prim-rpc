// @ts-check
import mdx from "@next/mdx"

const withMDX = mdx({
	extension: /\.mdx?$/,
	options: {
		remarkPlugins: [],
		rehypePlugins: [],
	},
})

const nextConfig = withMDX({
	reactStrictMode: true,
	swcMinify: true,
	webpack(given) {
		/** @type {import("webpack").Configuration} */
		const config = given
		// ...
		return config
	},
	pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
})

export default nextConfig
