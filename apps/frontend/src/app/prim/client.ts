import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin, createCallbackPlugin } from "@doseofted/prim-rpc-plugins/browser"
import jsonHandler from "superjson"
import type * as moduleType from "@doseofted/prim-example"

const host = process.env.NEXT_PUBLIC_WEBSITE_HOST ?? ""
const contained = JSON.parse(process.env.NEXT_PUBLIC_CONTAINED ?? "false") as boolean
const serverSide = typeof window === "undefined"

const module = serverSide ? await import("@doseofted/prim-example") : undefined
const endpoint = serverSide ? undefined : contained ? `https://api.${host}/prim` : "http://localhost:3001/prim"

const client = createPrimClient<typeof moduleType>({
	endpoint,
	module,
	jsonHandler,
	methodPlugin: createMethodPlugin(),
	callbackPlugin: createCallbackPlugin(),
})

export default client
