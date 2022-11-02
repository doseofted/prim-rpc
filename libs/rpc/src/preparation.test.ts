import { createPrimServer } from "."
import type { PrimClientFunction, PrimOptions, PrimSocketFunction } from "./interfaces"
import * as exampleServer from "@doseofted/prim-example"
import mitt, { Emitter } from "mitt"
import { expect, test } from "vitest"

/**
 * Generate HTTP/WS clients for Prim Client to simulate a function call to a Prim Server
 * (without any real servers)
 * 
 * @param commonOptions Client options that should also be shared with server
 * @returns `socket` and `client` options for Prim Client, used to communicate directly with Prim Server
 */
export function newTestClients (commonOptions: PrimOptions = {}): Pick<PrimOptions, "client"|"socket"> {
	/** Represents WebSocket connection */
	type ConnectedEvent = Emitter<{ messageClient: string, messageServer: string, ended: void }>
	const exampleContext = { context: "ted" }
	/** Represents potential WebSocket server */
	const wsServer = mitt<{ connect: void, connected: ConnectedEvent }>()
	/** Represents potential HTTP server */
	const httpServer = mitt<{ request: string, response: string }>()
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
			ws.on("messageServer", (msg) => {
				response(jsonHandler.parse(msg))
			})
			connected()
		})
		setTimeout(() => {
			wsServer.emit("connect")
		}, 0)
		return {
			send(msg) {
				wsConnection.emit("messageClient", jsonHandler.stringify(msg))
			},
		}
	}
	createPrimServer({
		...commonOptions,
		callbackHandler({ connected }) {
			wsServer.on("connect", () => {
				const { call, ended } = connected()
				const wsConnection: ConnectedEvent = mitt()
				wsConnection.on("messageClient", (m) => {
					call(String(m), (data) => {
						wsConnection.emit("messageServer", data)
					}, exampleContext)
					wsConnection.on("ended", ended)
				})
				wsServer.emit("connected", wsConnection)
			})
		},
		methodHandler({ server }) {
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			httpServer.on("request", async (body) => {
				const { call } = server()
				const response = await call({ body: String(body) }, undefined, exampleContext)
				httpServer.emit("response", response.body)
			})
		},
	})
	return { client, socket }
}

test("Prepared client is working", () => {
	// TODO: add some other test for testing client that doesn't overlap with client tests
	const { client, socket } = newTestClients({ module: exampleServer })
	expect(client).toBeTypeOf("function")
	expect(socket).toBeTypeOf("function")
})
