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
import { exampleModule } from "./testing/worker-server"
import * as example from "@doseofted/prim-example"

describe("Main thread as client, worker as server", () => {
	const worker = new Worker(new URL("./testing/worker-server", import.meta.url), { type: "module" })
	const methodPlugin = createMethodPlugin({ worker })
	const callbackPlugin = createCallbackPlugin({ worker })
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

describe("Main thread as server, worker as client", () => {
	const worker = new Worker(new URL("./testing/worker-client", import.meta.url), { type: "module" })
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
})
