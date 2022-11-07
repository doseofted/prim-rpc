import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
// import solid from "vite-plugin-solid"
// import unocss from "unocss/vite"
import pages from "vite-plugin-pages"
import react from "@vitejs/plugin-react"

export default defineConfig({
	plugins: [
		// solid(),
		dts(),
		// unocss(),
		pages(),
		react(),
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
		},
	},
	build: {
		lib: {
			formats: ["es"],
			fileName: (module, entry) => `index.${entry}.${module === "es" ? "m" : ""}js`,
			// LINK https://github.com/vitejs/vite/blob/v3.2.1/packages/vite/CHANGELOG.md#multiple-entries-for-library-mode
			entry: {
				react: new URL("./src/index.react.ts", import.meta.url).pathname,
			},
		},
		rollupOptions: {
			external: ["solid-js", "@doseofted/prim-docs", "react"],
		},
		// emptyOutDir: false,
	},
})
