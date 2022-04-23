import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	server: {
		host: "0.0.0.0", // needed for Docker
		cors: false, // no need to complicate things in development
		hmr: { clientPort: 443, port: 24678 }, // actual port Vite uses is `24678` but browser will connect to secured reverse proxy
	}
})
