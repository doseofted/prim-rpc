import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
// import solid from "vite-plugin-solid"
// import unocss from "unocss/vite"
import pages from "vite-plugin-pages"
import react from "@vitejs/plugin-react"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
	plugins: [
		// solid(),
		dts(),
		// unocss(),
		pages(),
		react(),
		vue(),
	],
	test: {
		include: ["src/**/*.test*"],
		environment: "jsdom",
		// transformMode: {
		// 	web: [/.[jt]sx?/],
		// },
		// deps: {
		// 	registerNodeLoader: true,
		// },
	},
	resolve: {
		alias: {
			"@": new URL("./src", import.meta.url).pathname,
			"@react": new URL("./src/generated/react/src", import.meta.url).pathname,
			"@vue": new URL("./src/generated/vue/vue3/src", import.meta.url).pathname,
			"@svelte": new URL("./src/generated/svelte/src", import.meta.url).pathname,
		},
	},
	build: {
		lib: {
			formats: ["es"],
			fileName: (_module, entry) => `${entry}.js`,
			// LINK https://github.com/vitejs/vite/blob/v3.2.1/packages/vite/CHANGELOG.md#multiple-entries-for-library-mode
			entry: {
				react: new URL("./src/react.ts", import.meta.url).pathname,
				vue: new URL("./src/vue.ts", import.meta.url).pathname,
			},
		},
		rollupOptions: {
			external: ["@doseofted/prim-docs", "react", "vue"],
		},
		// emptyOutDir: false,
	},
})
