import { defineConfig, PluginOption } from "vite"
import react from "@vitejs/plugin-react"
import pages from "vite-plugin-pages"
import dts from "vite-plugin-dts"
import vue from "@vitejs/plugin-vue"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [dts(), react(), pages(), vue() as unknown as PluginOption],
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
