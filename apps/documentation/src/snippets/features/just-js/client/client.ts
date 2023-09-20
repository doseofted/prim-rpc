import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin } from "@doseofted/prim-rpc-plugins/browser-fetch"
import type { Module } from "../server"

const methodPlugin = createMethodPlugin()
export default createPrimClient<Module>({
	endpoint: "http://localhost:3000",
	methodPlugin,
})
