/* eslint-disable @typescript-eslint/no-unused-vars */
import { createPrimServer, createPrimClient, testing } from "@doseofted/prim-rpc"
const plugins = testing.createPrimTestingPlugins()

function sayHello(x = "Backend", y = "Frontend") {
	return `${x}, meet ${y}.`
}
sayHello.rpc = true

const module = { sayHello }
const { methodHandler, callbackHandler } = plugins
const server = createPrimServer({ module, methodHandler, callbackHandler })

const { methodPlugin, callbackPlugin } = plugins
/** @type {import("@doseofted/prim-rpc").RpcModule<typeof module>} */
const client = createPrimClient({ methodPlugin, callbackPlugin })

const greeting = await client.sayHello("Backend", "Frontend")
const expected = sayHello("Backend", "Frontend")
console.log(greeting, greeting === expected)
