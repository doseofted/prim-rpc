// @ts-check
import path from "node:path"
import mdx from "@next/mdx"
import { remarkCodeHike } from "@code-hike/mdx"
import { readFileSync } from "fs"
import remarkToc from "remark-toc"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"
// import rehypeAutolinkHeadings from "rehype-autolink-headings"
import preventImport from "@doseofted/prim-rpc-tooling/build"

// NOTE: eslint doesn't appear to support assert syntax yet on imports
// LINK: https://github.com/eslint/eslint/discussions/15305#discussioncomment-1634740
// import theme from "./public/shiki/themes/bearded-theme-monokai-stone.json" assert { type: "json" }

const theme = JSON.parse(readFileSync("./public/shiki/themes/bearded-theme-monokai-stone.json", { encoding: "utf-8" }))

const withMDX = mdx({
	extension: /\.mdx?$/,
	options: {
		remarkPlugins: [[remarkCodeHike, { theme, showCopyButton: true }], remarkToc, remarkGfm],
		rehypePlugins: [rehypeSlug /* rehypeAutolinkHeadings */],
		providerImportSource: "@mdx-js/react",
	},
})

const nextConfig = withMDX({
	// NOTE: standalone mode appears to create issues in pnpm workspace
	// output: "standalone",
	experimental: {
		scrollRestoration: true,
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	reactStrictMode: true,
	swcMinify: true,
	webpack(given) {
		/** @type {import("webpack").Configuration} */
		const config = given
		const dirname = new URL("", import.meta.url).pathname
		const modulePath = path.join(dirname, "../../..", "libs/example")
		config.plugins?.push(preventImport.webpack({ name: modulePath }))
		return config
	},
	pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
})

export default nextConfig
