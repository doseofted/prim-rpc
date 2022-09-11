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
	createPrimAxiosClient,
} from "./client"
