import { resolve as resolvePath } from "node:path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import solid from "vite-plugin-solid"
import unocss from "unocss/vite"
import type { UserConfig as VitestConfig } from "vitest"
import type { UserConfig } from "vite"

// https://vitejs.dev/config/
const config: UserConfig & { test?: VitestConfig } = {
	plugins: [
		solid(),
		dts(),
		unocss(),
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
			formats: ["es", "umd"],
			entry: resolvePath(__dirname, "src/lib.ts"),
			name: "lib",
			fileName: (format) => `lib.${format}.${format === "es" ? "m" : "c"}js`,
		},
		rollupOptions: {
			// make sure to externalize deps that shouldn't be bundled
			// into your library
			// external: ["solid-js", "styled-components"],
			// output: {
			// 	// Provide global variables to use in the UMD build
			// 	// for externalized deps
			// 	globals: {
			// 		vue: "Vue",
			// 	},
			// },
		},
		// emptyOutDir: false,
	},
}

export default defineConfig(config)
