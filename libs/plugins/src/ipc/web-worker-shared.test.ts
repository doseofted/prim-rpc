// NOTE: this will be moved into other web worker tests once all are successful
import "@vitest/web-worker"
import { describe, expect, test } from "vitest"
import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin, createCallbackPlugin, jsonHandler } from "./web-worker"
import { exampleModule } from "./testing/server-worker"
import * as example from "@doseofted/prim-example"

describe("Shared worker: Main thread as client, worker as server", () => {
	const sharedWorker = new SharedWorker(new URL("./testing/server-shared", import.meta.url), { type: "module" })
	const methodPlugin = createMethodPlugin({ worker: sharedWorker })
	const callbackPlugin = createCallbackPlugin({ worker: sharedWorker })
	const client = createPrimClient<typeof exampleModule>({
		methodPlugin,
		callbackPlugin,
		jsonHandler,
		clientBatchTime: 0,
	})

	test("with single argument", () => {
		const args = { greeting: "What's up", name: "Ted" }
		void expect(client.sayHello(args)).resolves.toBe(example.sayHello(args))
	})

	test("with positional arguments", () => {
		const args = ["What's up", "Ted"] as const
		void expect(client.sayHelloAlternative(...args)).resolves.toBe(example.sayHelloAlternative(...args))
	})

	test("with errors", () => {
		void expect(client.oops()).rejects.toThrow("My bad.")
	})

	test("with additional types", () => {
		const today = new Date()
		const result = client.whatIsDayAfter(today)
		const expected = example.whatIsDayAfter(today)
		void expect(result).resolves.toStrictEqual(expected)
		void expect(result).resolves.toBeInstanceOf(Date)
	})

	test("with callbacks", async () => {
		async function withClient(given: typeof exampleModule | typeof client) {
			const statuses: string[] = []
			const result = await given.takeYourTime(20, status => {
				statuses.push(status)
			})
			console.log("result", statuses, result)
			return { result, statuses }
		}
		const result = withClient(client)
		const expected = withClient(example)
		void expect(await result).toStrictEqual(await expected)
	})

	const clientBatched = createPrimClient<typeof exampleModule>({
		methodPlugin,
		callbackPlugin,
		jsonHandler,
		clientBatchTime: 15,
	})

	test("with batching enabled", () => {
		// FIXME: Well, fix maybe. nested module can't be used here because server in web worker doesn't have direct access
		// to module (so it can't read upper levels to determine if path contains another function). This is fully expected
		// with security settings as configured today but does possibly restrict server-to-server communication.
		void expect(
			Promise.all([
				clientBatched.sayHello({ greeting: "What's up", name: "Ted" }),
				clientBatched.sayHelloAlternative("What's up", "Ted"),
			])
		).resolves.toStrictEqual([
			example.sayHello({ greeting: "What's up", name: "Ted" }),
			example.sayHelloAlternative("What's up", "Ted"),
		])
	})

	const sharedWorker2 = new SharedWorker(new URL("./testing/server-shared", import.meta.url), { type: "module" })
	// const methodPlugin2 = createMethodPlugin({ worker: sharedWorker2 })
	const callbackPlugin2 = createCallbackPlugin({ worker: sharedWorker2 })
	const client2 = createPrimClient<typeof exampleModule>({
		methodPlugin: methodPlugin,
		callbackPlugin: callbackPlugin2,
		jsonHandler,
		clientBatchTime: 0,
	})

	test("with single argument and second Shared Worker connected", () => {
		const args = { greeting: "What's up", name: "Ted" }
		void expect(client.sayHello(args)).resolves.toBe(example.sayHello(args))
	})

	// FIXME: this may not work due to connect event handler not being removed after finding port
	test("with second instance of SharedWorker", () => {
		const args = { greeting: "What's up", name: "Ted" }
		void expect(client2.sayHello(args)).resolves.toBe(example.sayHello(args))
	})
})
