import { describe, expect, test, vi } from "vitest";
import { CallCatcher } from "./call-catcher";
import {
	type Caught,
	type CaughtStack,
	CaughtType,
} from "./call-catcher-structure";

describe("CallCatcher can catch direct calls and props", () => {
	test("can catch direct method calls", () => {
		type ToCatch = (cb: () => void) => Caught;
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			const called =
				caught.type === CaughtType.Call && caught.path.length === 0;
			return called ? caught : next;
		});
		const callback = vi.fn();
		expect(callCatcher.proxy(callback)).toEqual(
			expect.objectContaining({
				type: CaughtType.Call,
				path: [],
				args: [callback],
			}),
		);
	});

	test("can catch method calls on direct object", () => {
		type ToCatch = {
			hello(name: string): Caught;
		};
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			const called =
				caught.type === CaughtType.Call && caught.path.at(-1) === "hello";
			return called ? caught : next;
		});
		expect(callCatcher.proxy.hello("Ted")).toEqual(
			expect.objectContaining({
				type: CaughtType.Call,
				path: ["hello"],
				args: ["Ted"],
			}),
		);
	});

	test("can catch property access on direct object", () => {
		type ToCatch = {
			test: Caught;
		};
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			const accessed =
				caught &&
				caught.type === CaughtType.Prop &&
				caught.path.at(-1) === "test";
			return accessed ? caught : next;
		});
		expect(callCatcher.proxy.test).toEqual(
			expect.objectContaining({
				type: CaughtType.Prop,
				path: ["test"],
			}),
		);
	});

	test("can catch direct constructors", () => {
		type ToCatch = {
			new (): Caught;
		};
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			const constructed =
				caught.type === CaughtType.New && caught.path.length === 0;
			return constructed ? caught : next;
		});
		expect(new callCatcher.proxy()).toEqual(
			expect.objectContaining({
				type: CaughtType.New,
				path: [],
			}),
		);
	});

	test("can catch constructors on direct object", () => {
		type ToCatch = {
			Test: {
				new (): Caught;
			};
		};
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			const constructed =
				caught.type === CaughtType.New && caught.path.at(-1) === "Test";
			return constructed ? caught : next;
		});
		expect(new callCatcher.proxy.Test()).toEqual(
			expect.objectContaining({
				type: CaughtType.New,
				path: ["Test"],
			}),
		);
	});
});

describe("CallCatcher can catch nested calls and props", () => {
	test("can catch method calls on nested objects", () => {
		type ToCatch = {
			good: {
				morning(name: string): Caught;
			};
		};
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			const called =
				caught.type === CaughtType.Call && caught.path.at(-1) === "morning";
			return called ? caught : next;
		});
		expect(callCatcher.proxy.good.morning("Ted")).toEqual(
			expect.objectContaining({
				type: CaughtType.Call,
				path: ["good", "morning"],
				args: ["Ted"],
			}),
		);
	});

	test("can catch method calls on result of another method call", () => {
		type ToCatch = {
			hello(name: "Ted"): Caught;
			hello(): {
				and: {
					goodbye(): CaughtStack;
				};
			};
		};
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			if (
				caught.type === CaughtType.Call &&
				caught.path.at(-1) === "hello" &&
				caught.args.at(0) === "Ted"
			) {
				return caught;
			}
			if (caught.type === CaughtType.Call && caught.path.at(-1) === "goodbye") {
				return stack;
			}
			return next;
		});
		expect(callCatcher.proxy.hello("Ted")).toEqual(
			expect.objectContaining({
				type: CaughtType.Call,
				args: ["Ted"],
				path: ["hello"],
			}),
		);
		expect(callCatcher.proxy.hello().and.goodbye()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: CaughtType.Call,
					args: [],
					path: ["hello"],
				}),
				expect.objectContaining({
					type: CaughtType.Call,
					args: [],
					path: ["and", "goodbye"],
				}),
			]),
		);
	});

	test("can catch property access on nested objects", () => {
		type ToCatch = {
			lorem: {
				ipsum: {
					foo: {
						bar: Caught;
					};
				};
			};
		};
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			const accessed =
				caught.type === CaughtType.Prop && caught.path.at(-1) === "bar";
			return accessed ? caught : next;
		});
		expect(callCatcher.proxy.lorem.ipsum.foo.bar).toEqual(
			expect.objectContaining({
				type: CaughtType.Prop,
				path: ["lorem", "ipsum", "foo", "bar"],
			}),
		);
	});
});
