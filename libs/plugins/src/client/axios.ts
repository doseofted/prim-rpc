import type { PrimClientFunction, RpcAnswer } from "@doseofted/prim-rpc"
import type { AxiosInstance } from "axios"

// TODO: test this plugin

export const createPrimAxiosClient = (client: AxiosInstance) => {
	const primClient: PrimClientFunction = async (endpoint, jsonBody, jsonHandler = JSON) => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { data } = await client.post(endpoint, jsonHandler.stringify(jsonBody), {
			headers: { "Content-Type": "application/json" },
			validateStatus: () => true, // don't throw error on HTTP error since Prim handles error property
			responseType: "json",
			transformResponse: [], // don't parse JSON since custom handler will be used
		})
		const responseStr = data as string
		const result = jsonHandler.parse<RpcAnswer>(responseStr)
		return result
	}
	return primClient
}
