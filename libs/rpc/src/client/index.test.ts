import { expect, test } from "vitest"
import { createPrimClient } from "./index"

type ExampleModule = {
	hello: (name?: string) => Promise<string>
	goodbye: () => string
	anError: () => void
	// what(): { is(): { this(): void } }
}
const exampleModule = {
	hello(name?: string) {
		return ["Hello", name].filter(given => given).join(" ")
	},
	anError() {
		throw "Uh-oh"
	},
}

test("static import", async () => {
	const options = {
		module: exampleModule,
		handleForms: true,
	} as const
	const client = createPrimClient<ExampleModule, typeof options>()
	// not async since module was provided locally
	expect(client.hello()).toBe("Hello")
	// FIXME: not implemented yet
	await expect(client.goodbye()).rejects.toBe("not implemented yet")
	expect(() => client.anError()).toThrow("Uh-oh")
})

test("dynamic import", async () => {
	const client = createPrimClient<ExampleModule>({
		module: new Promise<typeof exampleModule>(r =>
			r({
				// goodbye() { return "Bye!" },
				hello(name: string) {
					return ["Hello", name].filter(given => given).join(" ")
				},
				anError() {
					throw "Uh-oh"
				},
			})
		),
	})
	// not async since module was provided locally
	await expect(client.hello()).resolves.toBe("Hello")
	// FIXME: not implemented yet
	await expect(client.goodbye()).rejects.toBe("not implemented yet")
})
