import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin, createCallbackPlugin } from "@doseofted/prim-rpc-plugins/browser"
import jsonHandler from "superjson"
import type * as moduleType from "@doseofted/prim-example"

// const host = process.env.NEXT_PUBLIC_WEBSITE_HOST ?? ""
// const contained = JSON.parse(process.env.NEXT_PUBLIC_CONTAINED ?? "false") as boolean

/** Official client to use in website */
const client = createPrimClient<typeof moduleType>({
	module: typeof window === "undefined" ? import("@doseofted/prim-example") : null,
	endpoint: typeof window === "undefined" ? "" : window.location.origin + "/prim",
	jsonHandler,
	methodPlugin: createMethodPlugin(),
})

export default client

/** Client used for testing that communicates with separate backend in this project. */
export const testingClient =
	process.env.NODE_ENV === "development"
		? createPrimClient<typeof moduleType>({
				endpoint: "http://localhost:3001/prim",
				jsonHandler,
				methodPlugin: createMethodPlugin(),
				callbackPlugin: createCallbackPlugin(),
		  })
		: client
