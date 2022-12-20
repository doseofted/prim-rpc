import mitt, { Emitter } from "mitt"
import { createPrimClient } from "./client"
import {
	PrimServerMethodHandler,
	PrimServerCallbackHandler,
	PrimClientFunction,
	PrimSocketFunction,
	PrimOptions,
} from "./interfaces"
import { createPrimServer } from "./server"

// SECTION: mock servers
/** Represents an open WebSocket connection */
type ConnectedEvent = Emitter<{ messageClient: string; messageServer: string; ended: void }>

/**
 * Creates event emitters that are intended to represent potential events from both
 * an HTTP and WS server. Neither of these are real servers (used for testing).
 */
export function createTestServers() {
	/** Represents potential WebSocket server */
	const wsServer = mitt<{ connect: void; connected: ConnectedEvent }>()
	/** Represents potential HTTP server */
	const httpServer = mitt<{ request: string; response: string }>()
	return { httpServer, wsServer }
}
// !SECTION

// SECTION: Prim RPC Server options
interface MethodTestingOptions {
	context?: unknown
	httpServer: ReturnType<typeof createTestServers>["httpServer"]
}
export const primMethodTesting = (options: MethodTestingOptions): PrimServerMethodHandler => {
	const { context, httpServer } = options
	return ({ server }) => {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		httpServer.on("request", async body => {
			const { call } = server()
			const response = await call({ body: String(body) }, undefined, context)
			httpServer.emit("response", response.body)
		})
	}
}

interface CallbackTestingOptions {
	context?: unknown
	wsServer: ReturnType<typeof createTestServers>["wsServer"]
}
export const primCallbackTesting = (options: CallbackTestingOptions): PrimServerCallbackHandler => {
	const { context, wsServer } = options
	return ({ connected }) => {
		wsServer.on("connect", () => {
			const { call, ended } = connected()
			const wsConnection: ConnectedEvent = mitt()
			wsConnection.on("messageClient", m => {
				call(
					String(m),
					data => {
						wsConnection.emit("messageServer", data)
					},
					context
				)
				wsConnection.on("ended", ended)
			})
			wsServer.emit("connected", wsConnection)
		})
	}
}
// !SECTION

// SECTION: Prim RPC Client options
interface PrimClientOptions {
	httpServer: ReturnType<typeof createTestServers>["httpServer"]
}
export function primClientPlugin({ httpServer }: PrimClientOptions) {
	const client: PrimClientFunction = (_endpoint, bodyRpc, jsonHandler) =>
		new Promise(resolve => {
			const body = jsonHandler.stringify(bodyRpc)
			httpServer.on("response", body => {
				resolve(jsonHandler.parse(body))
			})
			httpServer.emit("request", body)
		})
	return client
}

interface PrimSocketOptions {
	wsServer: ReturnType<typeof createTestServers>["wsServer"]
}

export function primSocketPlugin({ wsServer }: PrimSocketOptions) {
	const socket: PrimSocketFunction = (_endpoint, { connected, ended: _ended, response }, jsonHandler) => {
		// NOTE: no need to call `ended` in test client unless destroyed
		let wsConnection: ConnectedEvent
		wsServer.on("connected", ws => {
			wsConnection = ws
			ws.on("messageServer", msg => {
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
	return socket
}
// !SECTION

// SECTION: pre-configured test client/server for Prim RPC

// FIXME: httpServer and wsServer use a single event emitter for all initial requests (ws emitter use two but one
// for initial connection) which is usually fine for testing but in a real client/server scenario, a new emitter
// should be created for each request so events only apply for that single request. Today, results are sent to all
// clients because they share an event emitter.
// Until fixed, a "do not use in "production" flag is in place (although there's not a good reason to use in production)

/**
 * Create a Prim RPC client and server that communicates with mock servers.
 * Mock servers are just event emitters used for testing Prim RPC in a single file.
 *
 * **Do not use in production.** This is useful for writing tests and getting started with Prim RPC.
 *
 * @param serverOptions Options to be given to Prim RPC *server* only
 * @param clientOptions Options to be given to Prim RPC *client* only
 * @param exampleContext Optional context to be used with servers
 * @returns Configured Prim RPC client and server
 */
export function createPrimTestingSuite<Module extends object, Ctx = unknown>(
	serverOptions: PrimOptions<Module>,
	clientOptions: PrimOptions<Module>,
	exampleContext?: Ctx
) {
	const { httpServer, wsServer } = createTestServers()
	const server = createPrimServer({
		...serverOptions,
		callbackHandler: primCallbackTesting({ wsServer, context: exampleContext }),
		methodHandler: primMethodTesting({ httpServer, context: exampleContext }),
	})
	const client = createPrimClient({
		...clientOptions,
		client: primClientPlugin({ httpServer }),
		socket: primSocketPlugin({ wsServer }),
	})
	return { client, server }
}
/**
 * Create Prim RPC plugins that will communicate with mock servers.
 * Mock servers are just event emitters used for testing Prim RPC in a single file.
 *
 * **Do not use in production.** This is useful for writing tests and understanding how Prim RPC works.
 *
 * @param exampleContext Optional context to be used with servers
 * @returns Configured Prim RPC client and server
 */
export function createPrimTestingPlugins<Ctx = unknown>(exampleContext?: Ctx) {
	const { httpServer, wsServer } = createTestServers()
	const callbackHandler = primCallbackTesting({ wsServer, context: exampleContext })
	const methodHandler = primMethodTesting({ httpServer, context: exampleContext })
	const client = primClientPlugin({ httpServer })
	const socket = primSocketPlugin({ wsServer })
	return { callbackHandler, methodHandler, client, socket }
}
// !SECTION
