import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import pages from "vite-plugin-pages"
import type { UserConfig as VitestConfig } from "vitest"
import type { UserConfig } from "vite"

// https://vitejs.dev/config/
const config: UserConfig & { test?: VitestConfig } = {
	plugins: [vue(), pages()],
	test: {
		globals: true,
		environment: "jsdom",
	},
	server: {
		host: "0.0.0.0", // needed for Docker
		cors: false, // no need to complicate things in development
		hmr: {
			protocol: "wss", // when used behind reverse proxy
			port: 24678, // actual port of dev server
			clientPort: 443, // port used by browser (reverse proxy will forward to actual port)
		},
	},
}
export default defineConfig(config)
