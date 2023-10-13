// @ts-check
import { defineConfig } from "astro/config"
import tailwind from "@astrojs/tailwind"
import react from "@astrojs/react"
import mdx from "@astrojs/mdx"
import sitemap from "@astrojs/sitemap"
import vercel from "@astrojs/vercel/serverless"
import rehypePrettyCode from "rehype-pretty-code"
import icon from "astro-icon"
import rehypeExternalLinks from "rehype-external-links"

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
			langs: ["typescript", "javascript", "jsx", "tsx", "shellscript", "astro"],
			wrap: false,
		},
		syntaxHighlight: false, // "shiki",
		remarkPlugins: [],
		rehypePlugins: [
			[rehypePrettyCode, rehypePrettyOptions],
			[rehypeExternalLinks, { target: "_blank" }],
		],
	},
	integrations: [
		tailwind(),
		react({
			include: "src/**/*.react.tsx",
		}),
		mdx(),
		sitemap({ filter: page => !page.startsWith("/tests/") }),
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
	redirects: {
		// List of short URLs
		"/docs": { destination: "/docs/learn/introduction", status: 302 },
		// Redirects from old documentation website
		"/docs/setup": { destination: "/docs/learn/setup", status: 301 },
		"/docs/examples": { destination: "/docs/learn/examples", status: 301 },
		// NOTE: features page removed
		"/docs/security": { destination: "/docs/learn/security", status: 301 },
		"/docs/limitations": { destination: "/docs/learn/limitations", status: 301 },
		"/docs/comparisons": { destination: "/docs/learn/comparisons", status: 301 },
		// TODO: add back remaining redirects once new pages are created
	},
})
