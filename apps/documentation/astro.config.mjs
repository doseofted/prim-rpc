// @ts-check
import { defineConfig } from "astro/config"
import tailwind from "@astrojs/tailwind"
import react from "@astrojs/react"
import mdx from "@astrojs/mdx"
import remarkToc from "remark-toc"
import sitemap from "@astrojs/sitemap"
import vercel from "@astrojs/vercel/serverless"
import rehypePrettyCode from "rehype-pretty-code"

/** @type {import('rehype-pretty-code').Options} */
const rehypePrettyOptions = {
	theme: "material-theme-palenight",
	defaultLang: "typescript",
	keepBackground: false,
}

// https://astro.build/config
export default defineConfig({
	site: "https://prim.doseofted.me",
	markdown: {
		shikiConfig: {
			theme: "material-theme-palenight",
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			langs: ["typescript", "javascript", "jsx", "tsx", "shellscript"],
			wrap: false,
		},
		remarkPlugins: [remarkToc],
		syntaxHighlight: false, // "shiki",
		rehypePlugins: [[rehypePrettyCode, rehypePrettyOptions]],
	},
	integrations: [
		tailwind(),
		react({
			include: "src/**/*.react.tsx",
		}),
		mdx(),
		sitemap(),
	],
	output: "hybrid",
	adapter: vercel({
		functionPerRoute: false,
	}),
})
