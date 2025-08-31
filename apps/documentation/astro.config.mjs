// @ts-check
import { defineConfig } from "astro/config"
import tailwind from "@astrojs/tailwind"
import react from "@astrojs/react"
import mdx from "@astrojs/mdx"
import sitemap from "@astrojs/sitemap"
import vercel from "@astrojs/vercel"
import rehypePrettyCode from "rehype-pretty-code"
import icon from "astro-icon"
import rehypeExternalLinks from "rehype-external-links"

/** @type {import('rehype-pretty-code').Options} */
const rehypePrettyOptions = {
	theme: "material-theme-palenight",
	defaultLang: {
		block: "typescript",
		inline: "typescript",
	},
	keepBackground: false,
}

// https://astro.build/config
export default defineConfig({
	site: "https://prim.doseofted.me",
	legacy: {
		collections: true
	},
	markdown: {
		shikiConfig: {
			theme: "material-theme-palenight",
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			langs: ["typescript", "javascript", "jsx", "tsx", "json", "json5", "shellscript", "console", "astro", "vue"],
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
	output: "server",
	adapter: vercel(),
	redirects: {
		// List of short URLs
		"/docs": { destination: "/docs/learn/introduction", status: 302 },
		// Redirects from old documentation website
		"/docs/setup": { destination: "/docs/learn/setup", status: 301 },
		"/docs/examples": { destination: "/docs/learn/examples", status: 301 },
		"/docs/security": { destination: "/docs/learn/security", status: 301 },
		"/docs/comparisons": { destination: "/docs/learn/comparisons", status: 301 },
		"/docs/limitations": { destination: "/docs/learn/limitations", status: 301 },
		"/docs/reference/configuration": { destination: "/docs/reference/config", status: 301 },
		"/docs/plugins/create": { destination: "/docs/reference/create", status: 301 },
		"/docs/plugins/server": { destination: "/docs/reference/plugins", status: 301 },
		"/docs/plugins/client": { destination: "/docs/reference/plugins", status: 301 },
		"/docs/plugins/ipc": { destination: "/docs/reference/plugins", status: 301 },
	},
})
