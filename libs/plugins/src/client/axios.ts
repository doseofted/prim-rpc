// Part of the Prim+RPC project ( https://prim.doseofted.com/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PrimClientMethodPlugin, RpcAnswer } from "@doseofted/prim-rpc"
import type { AxiosInstance } from "axios"

// TODO: test this plugin

export const createMethodPlugin = (client: AxiosInstance) => {
	const methodPlugin: PrimClientMethodPlugin = async (endpoint, jsonBody, jsonHandler = JSON) => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { data } = await client.post(endpoint, jsonHandler.stringify(jsonBody), {
			headers: { "content-type": jsonHandler.mediaType ?? "application/json" },
			validateStatus: () => true, // don't throw error on HTTP error since Prim handles error property
			responseType: "json",
			transformResponse: [], // don't parse JSON since custom handler will be used
		})
		const responseStr = data as string
		const result = jsonHandler.parse(responseStr) as RpcAnswer | RpcAnswer[]
		return result
	}
	return methodPlugin
}
