import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import unocss from "unocss/vite"
import pages from "vite-plugin-pages"

const contained = JSON.parse(process.env.VITE_CONTAINED ?? "false") === true

export default defineConfig({
	plugins: [
		solid(),
		unocss(),
		pages({ exclude: ["**/*.test.tsx"] }),
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
	server: contained ? {
		host: "0.0.0.0", // needed for Docker
		cors: false, // no need to complicate things in development
		hmr: {
			protocol: "wss", // when used behind reverse proxy
			port: 24678, // actual port of dev server
			clientPort: 443, // port used by browser (reverse proxy will forward to actual port)
		},
	} : {},
})
