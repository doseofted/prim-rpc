import { expect, test } from "vitest"
import { createPrimClient } from "./index"

type ExampleModule = { hello: (name?: string) => string; goodbye: () => string }

test("client", async () => {
	const client = createPrimClient<ExampleModule>({
		module: {
			hello(name: string) {
				return ["Hello", name].filter(given => given).join(" ")
			},
		},
	})
	// not async since module was provided locally
	expect(client.hello()).toBe("Hello")
	// FIXME: not implemented yet
	await expect(client.goodbye()).rejects.toBe("not implemented yet")
})
