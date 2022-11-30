import { createPrimClient } from "@doseofted/prim-rpc"
import type * as exampleClient from "@doseofted/prim-example"
import { createFetchClient, createWebSocketClient } from "@doseofted/prim-plugins/browser-api"
import jsonHandler from "superjson"

const host = process.env.NEXT_PUBLIC_WEBSITE_HOST
const contained = JSON.parse(process.env.NEXT_PUBLIC_CONTAINED ?? "false") as boolean
const clientSide = typeof window !== "undefined"
const backend = createPrimClient<typeof exampleClient>({
	endpoint: contained && clientSide ? `https://api.${host}/prim` : "http://localhost:3001/prim",
	clientBatchTime: 10,
	jsonHandler,
	client: createFetchClient(),
	socket: createWebSocketClient(),
})

export default backend
