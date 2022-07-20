import { defineConfig } from "vite"
import { resolve as resolvePath } from "node:path"
import vue from "@vitejs/plugin-vue"
import dts from "vite-plugin-dts"
import type { UserConfig as VitestConfig } from "vitest"
import type { UserConfig } from "vite"

// https://vitejs.dev/config/
const config: UserConfig & { test?: VitestConfig } = {
	plugins: [vue(), dts()],
	test: {
		globals: true,
		environment: "jsdom",
	},
	build: {
		lib: {
			formats: ["es", "umd"],
			entry: resolvePath(__dirname, "src/lib.ts"),
			name: "lib",
			fileName: (format) => `lib.${format}.js`,
		},
		rollupOptions: {
			// make sure to externalize deps that shouldn't be bundled
			// into your library
			external: ["vue"],
			output: {
				// Provide global variables to use in the UMD build
				// for externalized deps
				globals: {
					vue: "Vue",
				},
			},
		},
	},
}

export default defineConfig(config)
