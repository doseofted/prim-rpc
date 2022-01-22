import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	server: {
		host: "0.0.0.0",
		hmr: {
			// NOTE: use port 443 for use in Docker. Remove prop and use default for local development
			// REFERENCE: https://github.com/vitejs/vite/issues/4259#issuecomment-924219548
			port: 443
		}
	}
})
