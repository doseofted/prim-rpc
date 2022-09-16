export {
	// Fastify-related plugins
	primMethodFastify, fastifyPrimPlugin,
	// Express-related plugins
	primMethodExpress, expressPrimPlugin,
	// ws-module-related plugin
	primCallbackWs,
	// Web-Worker-related plugins
	primMethodWebWorker, primCallbackWebWorker,
} from "./server"
export {
	// Browser-native clients
	createFetchClient, createWebSocketClient,
	// Axios client plugin
	createPrimAxiosClient,
} from "./client"
