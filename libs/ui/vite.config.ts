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
			// externalize deps that shouldn't be bundled
			// external: [],
			// provide global variables to use in the UMD build
			// output: {
			// 	globals: {},
			// },
		},
		// emptyOutDir: false,
	},
}

export default defineConfig(config)
