import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import type { UserConfig as VitestConfig } from "vitest"
import type { UserConfig } from "vite"

// https://vitejs.dev/config/
const config: UserConfig & { test?: VitestConfig } = {
	plugins: [vue()],
	test: {
		globals: true,
		environment: "jsdom",
	},
}
export default defineConfig(config)
