import { test } from "vitest"
import { createRpcClient } from "./index"
import { ProvidedClientOptions } from "../options/provided"

test("client basic usage (temporary)", () => {
	const options = {
		allowSchema: { hello: true },
		handleForms: true,
	} as const
	const client = createRpcClient<{ hello(): string }, typeof options>(options)
	void client.hello()
})

test("client basic usage (temporary)", () => {
	const options = {
		module: {
			hello() {
				return "Hi!"
			},
		},
		allowSchema: { hello: true },
		handleForms: true,
	} satisfies ProvidedClientOptions
	const client = createRpcClient<{ lol(): number }, typeof options>(options)
	void client.hello()
	void client.lol()
})

test("client basic usage (temporary)", () => {
	const options = {
		module: {
			hello() {
				return "Hi!"
			},
		},
		allowSchema: { hello: true },
		handleForms: true,
	} satisfies ProvidedClientOptions
	const client = createRpcClient<{ lol(): number }, typeof options>(options)
	void client.hello()
	void client.lol()
})
