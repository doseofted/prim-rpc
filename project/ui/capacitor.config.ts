import { CapacitorConfig } from "@capacitor/cli"

declare const process: any // NOTE: provided by `@types/node` but this is not a Node project
const developerMode = (process as any).env.ENV_COMPOSE === "development"

const server = developerMode ? { url: "http://localhost:3000" } : undefined
console.log(developerMode, server)

const config: CapacitorConfig = {
	appId: "com.doseofted.prim",
	appName: "Prim",
	webDir: "dist",
	bundledWebRuntime: false,
	server
}

export default config
