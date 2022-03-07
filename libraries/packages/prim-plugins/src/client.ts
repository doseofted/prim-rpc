import type { RpcCall } from "prim"

// TODO use axios client for those who like to use Axios
// TODO write this
export const primAxiosClient = async (jsonBody: RpcCall, endpoint: string) => {
	const result = await fetch(endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(jsonBody)
	})
	// RPC result should be returned on success and RPC error thrown if errored
	return result.json()
}

// TODO consider supporting socket.io client
