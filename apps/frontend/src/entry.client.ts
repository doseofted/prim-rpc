import { createApp } from "./main"

async function start () {
	const { app, router } = createApp()
	await router.isReady()
	app.mount("#app")
}

void start()
