import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin, createCallbackPlugin } from "@doseofted/prim-rpc-plugins/browser"
import jsonHandler from "superjson"
import type * as module from "@doseofted/prim-example"

const host = process.env.NEXT_PUBLIC_WEBSITE_HOST ?? ""
const serverSide = typeof window === "undefined"
const contained = JSON.parse(process.env.NEXT_PUBLIC_CONTAINED ?? "false") as boolean

// https://github.com/vercel/next.js/issues/44062#issuecomment-1445183293
const serverUrl = "http://127.0.0.1:3000/prim"
const clientUrl = contained ? `https://api.${host}/prim` : serverUrl
const endpoint = serverSide ? serverUrl : clientUrl

const client = createPrimClient<typeof module>({
	endpoint,
	jsonHandler,
	methodPlugin: createMethodPlugin(),
	callbackPlugin: createCallbackPlugin(),
})

export default client
