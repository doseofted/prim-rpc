import { describe, test, expect } from "vitest"
import { createPrimClient, createPrimServer } from "."
import type * as exampleClient from "@doseofted/prim-example"
import * as exampleServer from "@doseofted/prim-example"
import type { PrimClientFunction, PrimOptions, PrimServerOptions, PrimSocketFunction } from "./interfaces"
import mitt, { Emitter } from "mitt"
import jsonHandler from "superjson"

const module = exampleServer
type IModule = typeof exampleClient

describe("Prim client instantiates", () => {
	// use case: not sure yet, possibly to return optimistic local result while waiting on remote result
	test("with local module", () => {
		const prim = createPrimClient({ module })
		expect(typeof prim.sayHelloAlternative === "function").toBeTruthy()
	})
	// use case: to contact remote server from client app (most common)
	test("with remote module", () => {
		const prim = createPrimClient<IModule>()
		expect(typeof prim.sayHello === "function").toBeTruthy()
	})
})

describe("Prim Client can call methods directly", () => {
	test("with local source", async () => {
		const prim = createPrimClient({ module })
		const params = { greeting: "Hi", name: "Ted" }
		const expected = module.sayHello(params)
		const result = await prim.sayHello(params)
		expect(result).toEqual(expected)
	})
	test("with remote source", async () => {
		const { client, socket } = newTestClient()
		const prim = createPrimClient<IModule>({ client, socket })
		const params = { greeting: "Hey", name: "Ted" }
		const expected = module.sayHello(params)
		const result = await prim.sayHello(params)
		expect(result).toEqual(expected)
	})
})

test("Prim Client can use alternative JSON handler", async () => {
	// JSON handler is only useful with remote source (no local source test needed)
	const commonOptions: PrimServerOptions = { jsonHandler }
	const testingOptions = newTestClient(commonOptions)
	const prim = createPrimClient<IModule>({ ...commonOptions, ...testingOptions })
	const date = new Date()
	const expected = module.whatIsDayAfter(date)
	const result = await prim.whatIsDayAfter(date)
	expect(result).toEqual(expected)
	expect(result).toBeInstanceOf(Date)
})

describe("Prim Client can call deeply nested methods", () => {
	test("with local source", async () => {
		const prim = createPrimClient({ module })
		const params = { greeting: "Sup", name: "Ted" }
		const expected = module.testLevel2.testLevel1.sayHello(params)
		const result = await prim.testLevel2.testLevel1.sayHello(params)
		expect(result).toEqual(expected)
	})
	test("with remote source", async () => {
		const { client, socket } = newTestClient()
		const prim = createPrimClient<IModule>({ client, socket })
		const params = { greeting: "Yo", name: "Ted" }
		const expected = module.testLevel2.testLevel1.sayHello(params)
		const result = await prim.testLevel2.testLevel1.sayHello(params)
		expect(result).toEqual(expected)
	})
})

describe("Prim Client can throw errors", () => {
	const expected = () => {
		try {
			return module.oops()
		} catch (error) {
			if (error instanceof Error) { return error.message }
			return "?"
		}
	}
	test("with local source", () => {
		const prim = createPrimClient({ module })
		const result = () => prim.oops()
		expect(result).toThrow(expected())
	})
	test("with remote source, default JSON handler", async () => {
		const { client, socket } = newTestClient()
		const prim = createPrimClient<IModule>({ client, socket })
		const result = () => prim.oops()
		await expect(result()).rejects.toThrow(expected())
		await expect(result()).rejects.toBeInstanceOf(Error)
	})
	test("with remote source and custom JSON handler", async () => {
		const commonOptions = { jsonHandler }
		const { client, socket } = newTestClient(commonOptions)
		const prim = createPrimClient<IModule>({ ...commonOptions, client, socket })
		const result = () => prim.oops()
		await expect(result()).rejects.toThrow(expected())
		await expect(result()).rejects.toBeInstanceOf(Error)
	})
})

/**
 * A simple client for Prim to simulate a function call to a server
 * (without a real server, just the Prim Server instance)
 * 
 * @param commonOptions Client options that should also be shared with server
 * @returns Clients for Prim Client, used to communicate directly with Prim Server
 */
function newTestClient (commonOptions: PrimOptions = {}): PrimOptions {
	/** Represents WebSocket connection */
	type ConnectedEvent = Emitter<{ messageClient: string, messageServer: string, ended: void }>
	/** Represents potential WebSocket server */
	const wsServer = mitt<{ connect: void, connected: ConnectedEvent }>()
	/** Represents potential HTTP server */
	const httpServer = mitt<{ request: string, response: string }>()
	createPrimServer({
		module,
		...commonOptions,
		callbackHandler({ connected }) {
			wsServer.on("connect", () => {
				const { call, ended } = connected()
				const wsConnection: ConnectedEvent = mitt()
				wsServer.emit("connected", wsConnection)
				wsConnection.on("messageClient", (m) => {
					call(String(m), (data) => { wsConnection.emit("messageServer", data) })
					wsConnection.on("ended", ended)
				})
			})
		},
		methodHandler({ client }) {
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			httpServer.on("request", async (body) => {
				const { call } = client()
				const response = await call({ body: String(body) })
				httpServer.emit("response", response.body)
			})
		},
	})
	const client: PrimClientFunction = (_endpoint, bodyRpc, jsonHandler) => new Promise(resolve => {
		const body = jsonHandler.stringify(bodyRpc)
		httpServer.on("response", (body) => {
			resolve(jsonHandler.parse(body))
		})
		httpServer.emit("request", body)
	})
	const socket: PrimSocketFunction = (_endpoint, { connected, ended: _ended, response }, jsonHandler) => {
		// NOTE: no need to call `ended` in test client unless destroyed
		let wsConnection: ConnectedEvent
		wsServer.on("connected", ws => {
			wsConnection = ws
			connected()
			ws.on("messageServer", (msg) => { response(jsonHandler.parse(msg)) })
		})
		wsServer.emit("connect")
		return {
			send(msg) {
				wsConnection?.emit("messageClient", jsonHandler.stringify(msg))
			},
		}
	}
	return { client, socket }
}
