import "@vitest/web-worker"
import { describe, expect, test } from "vitest"
import { createPrimClient, createPrimServer } from "@doseofted/prim-rpc"
import {
	createMethodPlugin,
	createCallbackPlugin,
	jsonHandler,
	createMethodHandler,
	createCallbackHandler,
} from "./web-worker"
import { exampleModule } from "./testing/server-worker"
import * as example from "@doseofted/prim-example"

function createClient(worker: Worker | SharedWorker) {
	const methodPlugin = createMethodPlugin({ worker })
	const callbackPlugin = createCallbackPlugin({ worker })
	const client = createPrimClient<typeof exampleModule>({
		methodPlugin,
		callbackPlugin,
		jsonHandler,
		clientBatchTime: 0,
	})
	return { worker, client }
}

describe.each([
	{
		name: "Dedicated Worker",
		...createClient(new Worker(new URL("./testing/server-worker", import.meta.url), { type: "module" })),
	},
	{
		name: "Shared Worker",
		...createClient(new SharedWorker(new URL("./testing/server-shared", import.meta.url), { type: "module" })),
	},
	// FIXME: In the browser, two Shared Workers can be started successfully but behavior of mock Shared Worker
	// in Vitest appears to have different behavior. I need to find a way to test this without manually running the browser.
	// {
	// 	name: "Second Shared Worker",
	// 	...createClient(new SharedWorker(new URL("./testing/server-shared", import.meta.url), { type: "module" })),
	// },
])("$name: Main thread as client, worker as server", ({ client, worker }) => {
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
			return { result, statuses }
		}
		const result = withClient(client)
		const expected = withClient(example)
		void expect(await result).toStrictEqual(await expected)
	})

	const clientBatched = createPrimClient<typeof exampleModule>({
		methodPlugin: createMethodPlugin({ worker }),
		callbackPlugin: createCallbackPlugin({ worker }),
		jsonHandler,
		clientBatchTime: 15,
	})

	test("with batching enabled", () => {
		void expect(
			Promise.all([
				clientBatched.testLevel1.sayHello({ greeting: "What's up", name: "Ted" }),
				clientBatched.testLevel2.testLevel1.sayHelloAlternative("What's up", "Ted"),
			])
		).resolves.toStrictEqual([
			example.testLevel1.sayHello({ greeting: "What's up", name: "Ted" }),
			example.testLevel2.testLevel1.sayHelloAlternative("What's up", "Ted"),
		])
	})
})

function createServerWithClientAccess(worker: Worker | SharedWorker) {
	const methodHandler = createMethodHandler({ worker })
	const callbackHandler = createCallbackHandler({ worker })
	// this where functions will actually be called from worker
	createPrimServer({
		module: example,
		methodHandler,
		callbackHandler,
		jsonHandler,
	})
	const methodPlugin = createMethodPlugin({ worker })
	const callbackPlugin = createCallbackPlugin({ worker })
	// this will be an easy way to call client in web worker from main thread
	const client = createPrimClient<typeof exampleModule>({
		methodPlugin,
		callbackPlugin,
		jsonHandler,
		clientBatchTime: 0,
	})
	return { client, worker }
}

describe.each([
	{
		name: "Dedicated Worker",
		...createServerWithClientAccess(
			new Worker(new URL("./testing/client-worker", import.meta.url), { type: "module" })
		),
	},
	{
		name: "Shared Worker",
		...createServerWithClientAccess(
			new SharedWorker(new URL("./testing/client-shared", import.meta.url), { type: "module" })
		),
	},
])("$name: Main thread as server, worker as client", ({ client, worker }) => {
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
			return { result, statuses }
		}
		const result = withClient(client)
		const expected = withClient(example)
		void expect(await result).toStrictEqual(await expected)
	})

	const clientBatched = createPrimClient<typeof exampleModule>({
		methodPlugin: createMethodPlugin({ worker }),
		callbackPlugin: createCallbackPlugin({ worker }),
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
})
