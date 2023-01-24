import type {
	BlobRecords,
	PrimClientMethodPlugin,
	PrimClientCallbackPlugin,
	RpcAnswer,
	RpcCall,
} from "@doseofted/prim-rpc"

// TODO: test this plugin

export const createMethodPlugin = (headersOverride?: Headers | Record<string, string>) => {
	const methodPlugin: PrimClientMethodPlugin = async (endpoint, jsonBody, jsonHandler, blobs = {}) => {
		let fetchOptions: RequestInit = {}
		const blobList = Object.entries(blobs)
		if (blobList.length > 0) {
			// send as form data if blobs is given (empty if not configured)
			const data = new FormData()
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			data.append("rpc", jsonHandler.stringify(jsonBody))
			for (const [key, blob] of blobList) {
				data.append(key, blob as Blob)
			}
			fetchOptions = {
				method: "POST",
				headers: { ...headersOverride }, // TODO: ensure this doesn't break form data
				body: data,
			}
		} else {
			// send all RPC requests without blobs as regular JSON
			fetchOptions = {
				method: "POST",
				headers: { "content-type": jsonHandler.mediaType ?? "application/json", ...headersOverride },
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				body: jsonHandler.stringify(jsonBody),
			}
		}
		const result = await fetch(endpoint, fetchOptions)
		const isBinaryLike = result.headers.get("content-type") === "application/octet-stream"
		return jsonHandler.parse(await (isBinaryLike ? result.blob() : result.text())) as RpcAnswer | RpcAnswer[]
	}
	return methodPlugin
}

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
