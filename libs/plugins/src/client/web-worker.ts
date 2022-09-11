// import type { PrimClientFunction, RpcAnswer } from "@doseofted/prim-rpc"
// import { MethodWebWorkerOptions } from "../server"

// TODO: test this plugin
// TODO: this plugin assumes the server is run in the main/UI thread however
// it's possible that roles could be reversed (server in Worker, client on main thread)
// and that may require a separate plugin (to figure out later)


// NOTE: below code isn't even kinda working yet (work on later)

// export const createPrimWebWorkerClient = (options: MethodWebWorkerOptions) => {
// 	const { worker, useJsonHandler } = options
// 	const primClient: PrimClientFunction = (_endpoint, jsonBody, jsonHandler = JSON) => new Promise(resolve => {
// 		const newMessageEvent = ({ data }: MessageEvent) => {
// 			if (useJsonHandler && typeof data === "string") {
// 				data = jsonHandler.stringify(data)
// 			}
// 			worker.removeEventListener("message", newMessageEvent)
// 		}
// 		worker.addEventListener("message", newMessageEvent)
// 		let updatedBody: string|undefined
// 		if (useJsonHandler && typeof jsonBody !== "string") {
// 			updatedBody = jsonHandler.stringify(jsonBody)
// 		}
// 		worker.postMessage(updatedBody ?? jsonBody)
// 		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// 		const responseStr = data as string
// 		const result = jsonHandler.parse<RpcAnswer>(responseStr)
// 		return result
// 	})
// 	return primClient
// }

// TODO: create WebSocket client version (to handle callbacks)

export {}