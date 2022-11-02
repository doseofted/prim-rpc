import { createPrimClient } from "@doseofted/prim-rpc"
import type * as exampleClient from "@doseofted/prim-example"
import { createFetchClient, createWebSocketClient } from "@doseofted/prim-plugins/dist/client/browser-api.mjs"
import jsonHandler from "superjson"

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const host = import.meta.env.VITE_WEBSITE_HOST as string
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const contained = import.meta.env.VITE_CONTAINED as string
const backend = createPrimClient<typeof exampleClient>({
	endpoint: contained
		? `https://api.${host}/prim-super`
		: "http://localhost:3001/prim-super",
	clientBatchTime: 10,
	jsonHandler,
	client: createFetchClient(),
	socket: createWebSocketClient(),
})

export default backend
