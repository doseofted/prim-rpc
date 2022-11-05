import { createPrimClient } from "@doseofted/prim-rpc"
import type * as exampleClient from "@doseofted/prim-example"
import { createFetchClient, createWebSocketClient } from "@doseofted/prim-plugins/dist/client/browser-api.mjs"
import jsonHandler from "superjson"

const host = import.meta.env.VITE_WEBSITE_HOST as string
const contained = import.meta.env.VITE_CONTAINED as string
const backend = createPrimClient<typeof exampleClient>({
	endpoint: contained
		? `https://api.${host}/prim`
		: "http://localhost:3001/prim",
	clientBatchTime: 10,
	jsonHandler,
	client: createFetchClient(),
	socket: createWebSocketClient(),
})

export default backend
