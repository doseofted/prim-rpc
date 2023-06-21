import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin, createCallbackPlugin } from "@doseofted/prim-rpc-plugins/browser"
import jsonHandler from "superjson"
import type * as moduleType from "@doseofted/prim-example"

// const host = process.env.NEXT_PUBLIC_WEBSITE_HOST ?? ""
// const contained = JSON.parse(process.env.NEXT_PUBLIC_CONTAINED ?? "false") as boolean

const client = createPrimClient<typeof moduleType>({
	module: typeof window === "undefined" ? import("@doseofted/prim-example") : null,
	jsonHandler,
	methodPlugin: createMethodPlugin(),
	callbackPlugin: createCallbackPlugin(),
})

export default client
