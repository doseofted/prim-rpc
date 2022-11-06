import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import solid from "vite-plugin-solid"
import unocss from "unocss/vite"
import pages from "vite-plugin-pages"

export default defineConfig({
	plugins: [
		solid(),
		dts(),
		unocss(),
		pages(),
	],
	test: {
		environment: "jsdom",
		transformMode: {
			web: [/.[jt]sx?/],
		},
		deps: {
			registerNodeLoader: true,
		},
	},
	build: {
		lib: {
			formats: ["es"],
			// LINK https://github.com/vitejs/vite/blob/v3.2.1/packages/vite/CHANGELOG.md#multiple-entries-for-library-mode
			entry: {
				index: new URL("./src/index.lib.ts", import.meta.url).pathname,
			},
		},
		rollupOptions: {
			external: ["solid-js", "@doseofted/prim-docs"],
		},
		// emptyOutDir: false,
	},
})
