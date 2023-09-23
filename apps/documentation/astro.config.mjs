// @ts-check
import { defineConfig } from "astro/config"
import tailwind from "@astrojs/tailwind"
import react from "@astrojs/react"
import mdx from "@astrojs/mdx"
import sitemap from "@astrojs/sitemap"
import vercel from "@astrojs/vercel/serverless"
import rehypePrettyCode from "rehype-pretty-code"
import icon from "astro-icon"

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
		remarkPlugins: [],
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
		icon({
			include: {
				ph: ["*"],
				"simple-icons": ["*"],
			},
		}),
	],
	output: "hybrid",
	adapter: vercel({
		functionPerRoute: false,
	}),
	// FIXME: add redirects for old website
	redirects: {
		"/docs/v0": { destination: "/docs/v0/usage/introduction", status: 301 },
		"/docs/latest": { destination: "/docs/v0", status: 302 },
	},
})
