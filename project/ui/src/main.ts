import { createApp } from "vue"
import App from "./App.vue"
import "@capacitor/core"
import router from "./router"
import "./style/index.scss"

const app = createApp(App)
app.use(router)
app.mount("#app")
