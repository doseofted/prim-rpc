import { createPrimClient, JsonHandler } from "@doseofted/prim-rpc"
import { createCallbackPlugin, createMethodPlugin } from "@doseofted/prim-rpc-plugins/browser-api"
import superjson from "superjson"
import type * as exampleClient from "@doseofted/prim-example"

const host = process.env.NEXT_PUBLIC_WEBSITE_HOST ?? ""
const contained = JSON.parse(process.env.NEXT_PUBLIC_CONTAINED ?? "false") as boolean
const clientSide = typeof window !== "undefined"

console.log(contained && clientSide ? `https://api.${host}/prim` : "http://localhost:3001/prim")

const backend = createPrimClient<typeof exampleClient>({
	endpoint: contained && clientSide ? `https://api.${host}/prim` : "http://localhost:3001/prim",
	clientBatchTime: 0,
	jsonHandler: superjson as JsonHandler,
	methodPlugin: createMethodPlugin(),
	callbackPlugin: createCallbackPlugin(),
})

export default backend
