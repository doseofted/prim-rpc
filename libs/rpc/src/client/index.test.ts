import { expect, test } from "vitest"
import { createPrimClient } from "./index"

type ExampleModule = { hello: (name?: string) => string; goodbye: () => string }

test("static import", async () => {
	const client = createPrimClient<() => Promise<ExampleModule>>({
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

test("dynamic import", async () => {
	const client = createPrimClient<ExampleModule>({
		module: new Promise<Partial<ExampleModule>>(r =>
			r({
				// goodbye() { return "Bye!" },
				hello(name: string) {
					return ["Hello", name].filter(given => given).join(" ")
				},
			})
		),
	})
	// not async since module was provided locally
	await expect(client.hello()).resolves.toBe("Hello")
	// FIXME: not implemented yet
	await expect(client.goodbye()).rejects.toBe("not implemented yet")
})
