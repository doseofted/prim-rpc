import type { BlobRecords, PrimClientCallbackPlugin, RpcCall } from "@doseofted/prim-rpc"

// TODO: test this plugin

export const createCallbackPlugin = () => {
	const callbackPlugin: PrimClientCallbackPlugin = (endpoint, { connected, response, ended }, jsonHandler) => {
		const ws = new WebSocket(endpoint)
		ws.onopen = connected
		ws.onclose = ended
		ws.onmessage = ({ data: message }) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			response(jsonHandler.parse(message))
		}
		const send = (msg: RpcCall | RpcCall[], blobs: BlobRecords) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			ws.send(jsonHandler.stringify(msg))
			const blobList = Object.entries(blobs)
			if (blobList.length < 1) {
				return
			}
			for (const [key, blob] of blobList) {
				// NOTE: this will likely destroy the blob (find alternative way of sending ID, maybe sequential messages)
				// const test = new Blob([`[${key}]`, blob], { type: blob.type })
				// ws.send(test)
				// NOTE: this may work since websocket messages are ordered but may mean extra processing server-side
				ws.send(key)
				ws.send(blob)
			}
		}
		const close = () => ws.close()
		return { send, close }
	}
	return callbackPlugin
}
