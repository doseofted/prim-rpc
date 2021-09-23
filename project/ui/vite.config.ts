import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { VitePWA } from "vite-plugin-pwa"
import eslint from "vite-plugin-eslint"
import VueComponents from "unplugin-vue-components/vite"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		VitePWA({
			injectRegister: "inline",
			registerType: "autoUpdate",
			strategies: "generateSW",
			manifest: {
				name: "Prim",
				short_name: "Prim",
				description: "Not another headless CMS.",
				background_color: "#ffffff",
				theme_color: "#ffffff",
				icons: [
					// { src: "/icon-mask-192.png", type: "image/png", sizes: "192x192", purpose: "maskable any" },
					// { src: "/icon-mask-512.png", type: "image/png", sizes: "512x512", purpose: "maskable any" },
				]
			}
		}),
		VueComponents({
			dts: true
		}),
		eslint()
	],
	server: {
		hmr: {
			overlay: true,
			host: "localhost",
			protocol: "ws"
		}
	}
})
