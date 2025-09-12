import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin } from "@doseofted/prim-rpc-plugins/browser-fetch"
import type { Module } from "../server"

// The Prim client knows how to call functions on the server
export default createPrimClient<Module>({
	endpoint: "http://localhost:3000/prim",
	methodPlugin: createMethodPlugin(),
})
