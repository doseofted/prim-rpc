import { createApp } from "vue"
import App from "./App.vue"
import "@capacitor/core"
import router from "./router"
import "./style/index.scss"
import { registerSW } from "virtual:pwa-register"
import { Capacitor } from "@capacitor/core"

const app = createApp(App)
app.use(router)
app.mount("#app")

const platform = Capacitor.getPlatform()
if (platform === "web") {
	registerSW({
		// onNeedRefresh() { },
		// onOfflineReady() { },
	})
}
