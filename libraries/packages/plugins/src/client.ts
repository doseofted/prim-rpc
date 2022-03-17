import type { PrimClientFunction, PrimSocketFunction, RpcCall } from "prim"
import type { AxiosInstance } from "axios"
import type { Socket as SocketIoSocket } from "socket.io-client"

// TODO use axios client for those who like to use Axios
// TODO write this
/* export const primAxiosClient = async (endpoint: string, jsonBody: RpcCall, jsonHandler: JSON = JSON) => {
	const result = await fetch(endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: jsonHandler.stringify(jsonBody)
	})
	// RPC result should be returned on success and RPC error thrown if errored
	return jsonHandler.parse(await result.text())
} */

// TODO actually test this
export const createPrimAxiosClient = (client: AxiosInstance) => {
	const primClient: PrimClientFunction = async (endpoint, jsonBody, jsonHandler = JSON) => {
		let { data: result } = await client.post(endpoint, jsonHandler.stringify(jsonBody), {
			headers: { "Content-Type": "application/json" },
			validateStatus: () => true, // don't throw error on HTTP error since Prim handles error property
			responseType: "json",
			transformResponse: [] // don't parse JSON since custom handler will be used
		})
		if (typeof result !== "string") {
			result = jsonHandler.stringify(result)
		}
		result = jsonHandler.parse(result)
		return result
	}
	return primClient
}

// TODO actually test this
/* export const createPrimSocketIoClient = (socket: SocketIoSocket) => {
	const primSocket: PrimSocketFunction = (endpoint, events, jsonHandler) => {
		socket.on("prim", data => {
			// const message = 
		})
	}
	return primSocket
}
 */
