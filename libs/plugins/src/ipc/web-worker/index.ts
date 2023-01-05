import {
	PrimClientFunction,
	PrimServerCallbackHandler,
	PrimServerMethodHandler,
	PrimSocketFunction,
	RpcAnswer,
	RpcCall,
} from "@doseofted/prim-rpc"

// FIXME: the following only works (for now) by bypassing the JSON handler on Prim client/server using the following:
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CallbackPluginWebWorkerOptions extends CallbackSharedWebWorkerOptions {
	// ...
}

// TODO: consider making two versions: worker-server (main is client) and worker-client (main is server)
// and try to make them share as much code as possible (this means 2 plugins and 2 handlers for web workers)

export const createCallbackPlugin = (options: CallbackPluginWebWorkerOptions): PrimSocketFunction => {
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

// FIXME: I may be able to remove the method handler/plugins altogether for Worker-related plugins. As long as Prim client can
// fallback to the the callback plugin/handlers if method-plugin is not given, then this may not be needed. Especially since
// the callback plugin has more functionality than the method plugin (method plugin is simpler for HTTP requests since
// I can only pass a request and a response).

export const createMethodPlugin = (options: CallbackPluginWebWorkerOptions): PrimClientFunction => {
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
