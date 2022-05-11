import { resolve as resolvePath } from "node:path"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import dts from "vite-plugin-dts"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue({
			template: {
				compilerOptions: {
					isCustomElement: (tag) => tag.includes("-")
				}
			}
		}),
		dts()
	],
	build: {
		lib: {
			entry: resolvePath(__dirname, "src/lib.ts"),
			name: "Docs",
			fileName: (format) => `docs.${format}.js`
		},
		rollupOptions: {
			external: ["vue"],
			output: {
				globals: {
					vue: "Vue"
				}
			}
		}
	}
})
