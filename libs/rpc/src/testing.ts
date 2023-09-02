// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import mitt, { Emitter, EventType } from "mitt"
import { nanoid } from "nanoid"
import { createPrimClient } from "./client"
import {
	PrimServerMethodHandler,
	PrimServerCallbackHandler,
	PrimClientMethodPlugin,
	PrimClientCallbackPlugin,
	PrimOptions,
	BlobRecords,
} from "./interfaces"
import { createPrimServer } from "./server"

// NOTE: these testing plugins are intended to mimic interactions with an HTTP and WS server in a single file

// SECTION: mock servers
/** Represents an open WebSocket connection */
type ConnectedEvent = Emitter<{ messageClient: string; messageServer: string; ended: undefined }>
/** Represents a request over HTTP (after connection is made) to upgrade to a WS connection */
type WsRequest = { connect: undefined; connected: ConnectedEvent }
/** Represent an HTTP request (after initial connection is made) */
type HttpRequest = { request: { body: string; blobs?: BlobRecords }; response: string }

// NOTE: Instead of directly sharing event emitters for `wsServer` and `httpServer` between server/client plugins for
// Prim RPC, a "connection" emitter is used to send a request ID from the client to the server which creates a unique
// instance of `wsServer` or `httpServer` (depending on what was requested) for use with that client only. This is only
// useful when creating multiple instances of Prim clients and/or servers sharing the same instance of a server/client
// plugin. However, if a developer shares plugins between instances (not originally intended but possible by design),
// it's a good idea to separate these requests, even if it's only purpose is for testing Prim RPC.
/**
 * Creates event emitters that are intended to represent potential events from both
 * an HTTP and WS server. Neither of these are real servers (used for testing).
 */
export function createTestServers() {
	/** Represents a connection that will create a request to the intended server (an event emitter, for testing) */
	const connection = <GivenEmitter extends Record<EventType, unknown>>() =>
		mitt<{ [request: `req:${string}`]: void; [response: `res:${string}`]: Emitter<GivenEmitter> }>()
	/** Represents potential connection to a WebSocket server */
	const wsConnection = connection<WsRequest>()
	/** Represents potential connection to an HTTP server */
	const httpConnection = connection<HttpRequest>()
	return { httpConnection, wsConnection }
}
// !SECTION

// SECTION: Prim RPC Server options
interface MethodTestingOptions {
	context?: unknown
	httpConnection: ReturnType<typeof createTestServers>["httpConnection"]
}
export const createMethodHandler = (options: MethodTestingOptions): PrimServerMethodHandler => {
	const { context, httpConnection } = options
	return ({ server }) => {
		httpConnection.on("*", reqId => {
			if (reqId.startsWith("res:")) {
				return
			}
			const httpServer = mitt<HttpRequest>()
			httpServer.on("request", async ({ body, blobs }) => {
				const { call } = server()
				const response = await call({ body: String(body), blobs }, context)
				httpServer.emit("response", response.body)
			})
			httpConnection.emit(`res:${reqId.replace(/^req:/, "")}`, httpServer)
		})
	}
}

interface CallbackTestingOptions {
	context?: unknown
	wsConnection: ReturnType<typeof createTestServers>["wsConnection"]
}
export const createCallbackHandler = (options: CallbackTestingOptions): PrimServerCallbackHandler => {
	const { context, wsConnection } = options
	return ({ connected }) => {
		wsConnection.on("*", reqId => {
			if (reqId.startsWith("res:")) {
				return
			}
			const wsServer = mitt<WsRequest>()
			wsServer.on("connect", () => {
				const { call, ended } = connected()
				const wsSession: ConnectedEvent = mitt()
				wsSession.on("messageClient", m => {
					call(
						String(m),
						// eslint-disable-next-line max-nested-callbacks
						data => {
							wsSession.emit("messageServer", data)
						},
						context
					)
					wsSession.on("ended", ended)
				})
				wsServer.emit("connected", wsSession)
			})
			wsConnection.emit(`res:${reqId.replace(/^req:/, "")}`, wsServer)
		})
	}
}
// !SECTION

// SECTION: Prim RPC Client options
interface PrimClientOptions {
	httpConnection: ReturnType<typeof createTestServers>["httpConnection"]
}
export function createMethodPlugin({ httpConnection }: PrimClientOptions) {
	const client: PrimClientMethodPlugin = (_endpoint, bodyRpc, jsonHandler, blobs) => {
		return new Promise(resolve => {
			const reqId = nanoid()
			httpConnection.on(`res:${reqId}`, httpServer => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const body = jsonHandler.stringify(bodyRpc)
				httpServer.on("response", body => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					resolve(jsonHandler.parse(body))
				})
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				httpServer.emit("request", { body, blobs })
			})
			httpConnection.emit(`req:${reqId}`)
		})
	}
	return client
}

interface PrimSocketOptions {
	wsConnection: ReturnType<typeof createTestServers>["wsConnection"]
}

export function createCallbackPlugin({ wsConnection }: PrimSocketOptions) {
	const socket: PrimClientCallbackPlugin = (_endpoint, { connected, ended: _ended, response }, jsonHandler) => {
		let wsSession: ConnectedEvent
		const reqId = nanoid()
		wsConnection.on(`res:${reqId}`, wsServer => {
			// NOTE: no need to call `ended` in test client unless destroyed
			wsServer.on("connected", ws => {
				wsSession = ws
				ws.on("messageServer", msg => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					response(jsonHandler.parse(msg))
				})
				connected()
			})
			setTimeout(() => {
				wsServer.emit("connect")
			}, 0)
		})
		wsConnection.emit(`req:${reqId}`)
		return {
			send(msg) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				wsSession.emit("messageClient", jsonHandler.stringify(msg))
			},
		}
	}
	return socket
}
// !SECTION

// SECTION: pre-configured test client/server for Prim RPC

/**
 * Create Prim RPC plugins that will communicate with mock servers.
 * Mock servers are just event emitters used for testing Prim RPC in a single file.
 *
 * This is useful for writing tests and understanding how Prim RPC works.
 *
 * @param exampleContext Optional context to be used with servers
 * @returns Configured Prim RPC client and server
 */
export function createPrimTestingPlugins<Ctx = unknown>(exampleContext?: Ctx) {
	const { httpConnection, wsConnection } = createTestServers()
	const methodHandler = createMethodHandler({ httpConnection, context: exampleContext })
	const callbackHandler = createCallbackHandler({ wsConnection, context: exampleContext })
	const methodPlugin = createMethodPlugin({ httpConnection })
	const callbackPlugin = createCallbackPlugin({ wsConnection })
	return { methodHandler, callbackHandler, methodPlugin, callbackPlugin }
}

/**
 * Create a Prim RPC client and server that communicates with mock servers.
 * Mock servers are just event emitters used for testing Prim RPC in a single file.
 *
 * This is useful for writing tests and getting started with Prim RPC.
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
	const { methodHandler, callbackHandler, methodPlugin, callbackPlugin } = createPrimTestingPlugins(exampleContext)
	const server = createPrimServer({
		...serverOptions,
		methodHandler,
		callbackHandler,
	})
	const client = createPrimClient({
		...clientOptions,
		methodPlugin,
		callbackPlugin,
	})
	return { client, server }
}
// !SECTION
