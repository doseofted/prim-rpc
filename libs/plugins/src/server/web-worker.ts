import type { PrimServerCallbackHandler, PrimServerMethodHandler, RpcCall } from "@doseofted/prim-rpc"

// TODO: test these plugins (alongside client plugins for web workers)

export interface MethodWebWorkerOptions {
	/**
	 * The type of worker used. By default, `"web-worker"`
	 */
	// NOTE: add "type" once other workers are supported
	// type?: "web-worker"|"shared-worker"|"cross-window"|"node-worker-thread"
	worker: Worker // add other types once supported
	/**
	 * Web Workers will, by default, post messages using a
	 * [structured cloning algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
	 * which is typically more powerful than typical JSON serialization. Because of this, the Prim Web Worker plugin will
	 * skip using the JSON handler provided to the Prim client. However, you can choose to use the JSON handler
	 * instead by toggling this option to `true`.
	 *
	 * **Important:** This option should match the option of the Web Worker Prim client plugin
	 * since it will also assume that the JSON handler is not used by default.
	 */
	useJsonHandler?: boolean
	/**
	 * Specify a list of allowed origins for messages. By default, this will consist of only one origin:
	 * the window's origin (`window.origin`). You can set this option to an empty array to
	 * disallow all origins or specify a new list of origins to allow messages from them.
	 *
	 * **Note:** if `allowedOrigins` is changed, remember to add back `window.origin` if you still want
	 * to receive events from the same origin.
	 */
	// NOTE: Web Workers need to be in same origin so this doesn't apply here but may be useful for cross-window messaging
	// LINK: https://javascript.info/cross-window-communication#cross-window-messaging
	// allowedOrigins?: string[]
}

/**
 * A Prim plugin used to register events on a Web Worker in the main/UI thread. In the future,
 * this plugin may be expanded to support Shared Workers, cross-window messaging, and maybe
 * Service Workers.
 *
 * Currently, this plugin assumes the Prim Server is run in the main thread. A separate version of the plugin
 * may be created where the server is run in a worker and the client is run in the main thread.
 *
 * Use like so:
 *
 * ```ts
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { primMethodWebWorker, primCallbackWebWorker } from "@doseofted/prim-rpc-plugins"
 *
 * const worker = new Worker(new URL('./my-worker.ts', import.meta.url), { type: "module" })
 *
 * const prim = createPrimServer({
 *   methodHandler: primMethodWebWorker({ worker }),
 *   // you may also consider using `primCallbackWebWorker` below
 *   callbackHandler: primCallbackWebWorker({ worker })
 * })
 * ```
 */
export const primMethodWebWorker = (options: MethodWebWorkerOptions): PrimServerMethodHandler => {
	const { worker, useJsonHandler = false } = options
	return prim => {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		worker.addEventListener("message", async event => {
			event.origin === window.origin
			const { jsonHandler } = prim.options
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			let { data } = event
			if (useJsonHandler && typeof data === "string") {
				// Prim Client option was set to same value as server
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				data = jsonHandler.parse(data)
			} else if (useJsonHandler) {
				// Prim Client doesn't know server is using JSON handler (consider throwing error)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				data = jsonHandler.parse(JSON.stringify(data))
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			const answer = await prim.server().prepareRpc(data)
			worker.postMessage(answer)
		})
	}
}

export const primCallbackWebWorker = (options: MethodWebWorkerOptions): PrimServerCallbackHandler => {
	const { worker } = options
	return prim => {
		// NOTE: I shouldn't need to define new event handler for "connected" event (like I would for WebSocket connection)
		// since there should only be one Prim client for each Worker. I'll need to learn more about Workers to see if this
		// behavior should be changed to support multiple workers for each client.
		const { ended, rpc } = prim.connected()
		// NOTE: Custom Events will be emitted from client-side Prim Web Worker plugin
		// TODO: consider using "message" event for callback data and Custom Events for methods instead
		// (this is currently reversed)
		worker.addEventListener("ws-message", (event: CustomEvent<RpcCall | RpcCall[]>) => {
			rpc(event.detail, result => {
				worker.postMessage(result)
			})
		})
		worker.addEventListener("error", () => {
			ended()
		})
		worker.addEventListener("messageerror", () => {
			ended()
		})
	}
}
