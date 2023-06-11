import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin, createCallbackPlugin } from "@doseofted/prim-rpc-plugins/browser"
import jsonHandler from "superjson"
import type * as module from "@doseofted/prim-example"

// const host = process.env.NEXT_PUBLIC_WEBSITE_HOST ?? ""
// const contained = JSON.parse(process.env.NEXT_PUBLIC_CONTAINED ?? "false") as boolean

console.log(process.env)
const endpoint = typeof window === "undefined" ? "http://localhost:3000/prim" : "/prim"
const client = createPrimClient<typeof module>({
	endpoint,
	jsonHandler,
	methodPlugin: createMethodPlugin(),
	callbackPlugin: createCallbackPlugin(),
})

export default client
