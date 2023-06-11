import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin, createCallbackPlugin } from "@doseofted/prim-rpc-plugins/browser"
import jsonHandler from "superjson"
import type * as module from "@doseofted/prim-example"

const host = process.env.NEXT_PUBLIC_WEBSITE_HOST ?? ""
const serverSide = typeof window === "undefined"
// const contained = JSON.parse(process.env.NEXT_PUBLIC_CONTAINED ?? "false") as boolean

const endpoint = serverSide ? "http://localhost:3000/prim" : `https://api.${host}/prim`
const client = createPrimClient<typeof module>({
	endpoint,
	jsonHandler,
	methodPlugin: createMethodPlugin(),
	callbackPlugin: createCallbackPlugin(),
})

export default client
