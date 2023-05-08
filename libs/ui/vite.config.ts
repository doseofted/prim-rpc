import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import vue from "@vitejs/plugin-vue"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [dts(), react(), vue()],
	build: {
		lib: {
			formats: ["es"],
			fileName: (_module, entry) => `${entry}.js`,
			// LINK https://github.com/vitejs/vite/blob/v3.2.1/packages/vite/CHANGELOG.md#multiple-entries-for-library-mode
			entry: {
				"index.react": new URL("./src/index.react.ts", import.meta.url).pathname,
				"index.vue": new URL("./src/index.vue.ts", import.meta.url).pathname,
			},
		},
		rollupOptions: {
			external: ["@doseofted/prim-rpc-tooling", "react", "vue"],
		},
		// emptyOutDir: false,
	},
})
