import {
	PrimClientMethodPlugin,
	PrimServerCallbackHandler,
	PrimServerMethodHandler,
	PrimClientCallbackPlugin,
	RpcAnswer,
	RpcCall,
} from "@doseofted/prim-rpc"

// SECTION Shared options

/**
 * NOTE: Web Workers, by default, post messages using a
 * [structured cloning algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
 * which is typically more powerful than typical JSON serialization. This situation needs to be considered because currently
 * the Prim client sets JSON handler options (not plugins). While this plugin can support using a JSON handler, it's not
 * nearly as powerful so this may need to be noted in the plugin's documentation that the JSON handler should just pass
 * information transparently through instead of serializing/deserializing it.
 */
// FIXME: this plugin only works (for now) by bypassing the JSON handler on the Prim client/server using the following:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const jsonHandler = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
	parse: (given: string) => given as any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	stringify: (given: any) => given as string,
}

interface CallbackSharedWebWorkerOptions {
	worker: Worker | Window
}

// !SECTION

// SECTION Callback handler / plugin

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CallbackPluginWebWorkerOptions extends CallbackSharedWebWorkerOptions {
	// ...
}

// TODO: consider making two versions: worker-server (main is client) and worker-client (main is server)
// and try to make them share as much code as possible (this means 2 plugins and 2 handlers for web workers)

export const createCallbackPlugin = (options: CallbackPluginWebWorkerOptions): PrimClientCallbackPlugin => {
	const { worker = self } = options
	return (_endpoint, { connected, response, ended }) => {
		worker.addEventListener("message", (event: MessageEvent<RpcAnswer>) => {
			response(event.data)
		})
		worker.addEventListener("error", () => {
			ended()
		})
		setTimeout(() => {
			connected()
		}, 0)
		return {
			send(message, _blobs) {
				worker.postMessage(message)
			},
		}
	}
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CallbackHandlerWebWorkerOptions extends CallbackSharedWebWorkerOptions {
	// ...
}
// TODO: consider what to do when JSON handler is used (and either string or binary contents are given instead of actual RPC)
export const createCallbackHandler = (options: CallbackHandlerWebWorkerOptions): PrimServerCallbackHandler => {
	const { worker } = options
	return prim => {
		worker.addEventListener("message", (event: MessageEvent<RpcCall>) => {
			// FIXME: typescript definitions need to be adjusted since JSON handler is (likely) not needed
			call(event.data as unknown as string, data => {
				worker.postMessage(data)
			})
		})
		worker.addEventListener("error", () => {
			ended()
		})
		const { call, ended } = prim.connected()
	}
}
// !SECTION

// SECTION Method handler / plugin

// FIXME: I may be able to remove the method handler/plugins altogether for Worker-related plugins. As long as Prim client can
// fallback to the the callback plugin/handlers if method-plugin is not given, then this may not be needed. Especially since
// the callback plugin has more functionality than the method plugin (method plugin is simpler for HTTP requests since
// I can only pass a request and a response).

export const createMethodPlugin = (options: CallbackPluginWebWorkerOptions): PrimClientMethodPlugin => {
	const { worker = self } = options
	return (_endpoint, message) =>
		new Promise((resolve, reject) => {
			const listener = (event: MessageEvent<RpcAnswer>) => {
				worker.removeEventListener("message", listener)
				resolve(event.data)
			}
			worker.addEventListener("message", listener)
			worker.addEventListener("error", err => {
				reject(err)
			})
			worker.postMessage(message)
		})
}

export const createMethodHandler = (options: CallbackHandlerWebWorkerOptions): PrimServerMethodHandler => {
	const { worker } = options
	return prim => {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		worker.addEventListener("message", async (event: MessageEvent<RpcCall>) => {
			const result = await prim.server().prepareRpc(event.data)
			worker.postMessage(result)
		})
	}
}
// !SECTION

// SECTION: Custom events for web workers

// NOTE: this section is not used yet but could be useful for other types of workers (this may be deleted later)

enum PrimEvent {
	Connect = "prim-connect",
}

interface PrimEventDetail {
	[PrimEvent.Connect]: CustomEvent<{
		id: string
	}>
}

type PossibleContext = Window | Worker | SharedWorker | ServiceWorker

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function customDispatchEvent<T extends PrimEvent>(
	parent: PossibleContext,
	event: T,
	data: Partial<PrimEventDetail[T]> & Pick<PrimEventDetail[T], "detail">
) {
	return parent.dispatchEvent(new CustomEvent(event, data))
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function customAddEventListener<T extends PrimEvent>(
	parent: PossibleContext,
	event: T,
	callback: (event: PrimEventDetail[T]) => void
) {
	return parent.addEventListener(event, e => {
		const event = e as PrimEventDetail[T]
		callback(event)
	})
}
// !SECTION
