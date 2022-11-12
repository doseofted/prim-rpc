import type { BlobRecords, PrimClientFunction, PrimSocketFunction, RpcAnswer, RpcCall } from "@doseofted/prim-rpc"

// TODO: test this plugin

export const createFetchClient = (headersOverride?: Headers | Record<string, string>) => {
	const primClient: PrimClientFunction = async (endpoint, jsonBody, jsonHandler, blobs = {}) => {
		let fetchOptions: RequestInit = {}
		const blobList = Object.entries(blobs)
		if (blobList.length > 0) {
			// send as form data if blobs is given (empty if not configured)
			const data = new FormData()
			data.append("rpc", jsonHandler.stringify(jsonBody))
			for (const [key, blob] of blobList) {
				data.append(key, blob)
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
				headers: { "Content-Type": "application/json", ...headersOverride },
				body: jsonHandler.stringify(jsonBody),
			}
		}
		const result = await fetch(endpoint, fetchOptions)
		return jsonHandler.parse<RpcAnswer | RpcAnswer[]>(await result.text())
	}
	return primClient
}

export const createWebSocketClient = () => {
	const primSocket: PrimSocketFunction = (endpoint, { connected, response, ended }, jsonHandler) => {
		const ws = new WebSocket(endpoint)
		ws.onopen = connected
		ws.onclose = ended
		ws.onmessage = ({ data: message }) => {
			response(jsonHandler.parse(message as string))
		}
		const send = (msg: RpcCall | RpcCall[], blobs: BlobRecords) => {
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
		return { send }
	}
	return primSocket
}
