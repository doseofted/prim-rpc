import { createApp } from "vue"
import App from "./App.vue"
import "@capacitor/core"
import router from "./router"
import "./style/index.scss"
import { registerSW } from "virtual:pwa-register"
import { Capacitor } from "@capacitor/core"
import { MotionPlugin } from "@vueuse/motion"
import { GesturePlugin } from "@vueuse/gesture"
import { createHead } from "@vueuse/head"

const head = createHead()

const app = createApp(App).use(router)
	.use(head)
	.use(MotionPlugin)
	.use(GesturePlugin)
app.mount("#app")

const platform = Capacitor.getPlatform()
if (platform === "web") {
	registerSW({
		// onNeedRefresh() { },
		// onOfflineReady() { },
	})
}
