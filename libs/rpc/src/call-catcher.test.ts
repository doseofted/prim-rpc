import { describe, expect, test, vi } from "vitest";
import {
	CallCatcher,
	CallCatcherError,
	type Caught,
	CaughtCallType,
	CaughtPropType,
	type CaughtStack,
	CaughtType,
} from "./call-catcher";

describe.todo("CallCatcher can be configured", () => {
	// ...
});

describe("CallCatcher can be initialized from a previous instance", () => {
	test("original stack can be transferred", () => {
		function callFuncName(caught: Caught, name: string) {
			const isCall = caught.type === CaughtType.Call;
			const lastPath = caught.path.at(-1);
			const match = isCall && lastPath === name;
			return match;
		}
		const catcher1 = new CallCatcher((next, stack) => {
			const caught = stack.at(-1);
			if (callFuncName(caught, "path")) return stack;
			return next;
		});
		const conditionResult1 = catcher1.proxy.deep.nested.path();
		const catcher2 = new CallCatcher((next, stack) => {
			const caught = stack.at(-1);
			if (callFuncName(caught, "path")) return 123;
			if (callFuncName(caught, "done")) return stack;
			return next;
		});
		const conditionResult2 = catcher2.setInitialStack(conditionResult1, true);
		const continuedCallResult = catcher2.proxy.testing.lorem.ipsum.done();
		expect(conditionResult1).toEqual([
			expect.objectContaining({
				type: CaughtType.Call,
				path: ["deep", "nested", "path"],
				args: [],
			}),
		]);
		expect(conditionResult2).toEqual(123);
		expect(continuedCallResult).toEqual([
			expect.objectContaining({
				type: CaughtType.Call,
				callMethod: CaughtCallType.Function,
				path: ["deep", "nested", "path"],
				args: [],
			}),
			expect.objectContaining({
				type: CaughtType.Call,
				callMethod: CaughtCallType.Function,
				path: ["testing", "lorem", "ipsum", "done"],
				args: [],
			}),
		]);
		// we've already replayed the stack, we're not able to do so again
		expect(() => catcher2.setInitialStack(conditionResult2)).toThrow(
			CallCatcherError,
		);
	});
});

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

	test("can catch direct constructors", () => {
		type ToCatch = {
			new (): Caught;
		};
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			const constructed =
				caught.type === CaughtType.Call &&
				caught.callMethod === CaughtCallType.Constructor &&
				caught.path.length === 0;
			return constructed ? caught : next;
		});
		expect(new callCatcher.proxy()).toEqual(
			expect.objectContaining({
				type: CaughtType.Call,
				callMethod: CaughtCallType.Constructor,
				args: [],
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
				caught.type === CaughtType.Call &&
				caught.callMethod === CaughtCallType.Constructor &&
				caught.path.at(-1) === "Test";
			return constructed ? caught : next;
		});
		expect(new callCatcher.proxy.Test()).toEqual(
			expect.objectContaining({
				type: CaughtType.Call,
				callMethod: CaughtCallType.Constructor,
				args: [],
				path: ["Test"],
			}),
		);
	});

	test("can catch property access on direct object", () => {
		type ToCatch = {
			test: CaughtStack;
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

	test("can catch property modification", () => {
		type ToCatch = {
			test: number;
		};
		const cb = vi.fn();
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			const testPropInteraction =
				caught &&
				caught.type === CaughtType.Prop &&
				caught.path.at(-1) === "test";
			const testPropSet =
				testPropInteraction && caught.interaction === CaughtPropType.Assignment;
			if (testPropSet) cb(caught.value);
			const testPropAccess =
				testPropInteraction && caught.interaction === CaughtPropType.Access;
			return testPropAccess ? stack : next;
		});
		callCatcher.proxy.test = 5;
		expect(cb).toHaveBeenCalledWith(5);
		callCatcher.proxy.test = 10;
		expect(cb).toHaveBeenCalledWith(10);
		expect(callCatcher.proxy.test).toEqual([
			expect.objectContaining({
				type: CaughtType.Prop,
				path: ["test"],
				interaction: CaughtPropType.Assignment,
				value: 5,
			}),
			expect.objectContaining({
				type: CaughtType.Prop,
				path: ["test"],
				interaction: CaughtPropType.Assignment,
				value: 10,
			}),
			expect.objectContaining({
				type: CaughtType.Prop,
				path: ["test"],
				interaction: CaughtPropType.Access,
			}),
		]);
	});

	test("can catch property deletions", () => {
		type ToCatch = {
			test: number;
		};
		const cb = vi.fn();
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			const testPropInteraction =
				caught &&
				caught.type === CaughtType.Prop &&
				caught.path.at(-1) === "test";
			const testPropDelete =
				testPropInteraction && caught.interaction === CaughtPropType.Deletion;
			if (testPropDelete) cb();
			const testPropAccess =
				testPropInteraction && caught.interaction === CaughtPropType.Access;
			return testPropAccess ? stack : next;
		});
		delete callCatcher.proxy.test;
		expect(cb).toHaveBeenCalled();
		expect(callCatcher.proxy.test).toEqual([
			expect.objectContaining({
				type: CaughtType.Prop,
				path: ["test"],
				interaction: CaughtPropType.Deletion,
			}),
			expect.objectContaining({
				type: CaughtType.Prop,
				path: ["test"],
				interaction: CaughtPropType.Access,
			}),
		]);
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
		expect(callCatcher.proxy.hello().and.goodbye()).toEqual([
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
		]);
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

	test("can catch property access with modification history", () => {
		type ToCatch = {
			lorem: {
				ipsum: {
					foo: {
						bar: number | CaughtStack;
					};
				};
			};
		};
		const stackUpdate = vi.fn();
		const callCatcher = new CallCatcher<ToCatch>((next, stack) => {
			const caught = stack.at(-1);
			stackUpdate(caught);
			const accessed =
				caught.type === CaughtType.Prop && caught.path.at(-1) === "bar";
			if (accessed) return stack;
			return next;
		});
		const proxy = callCatcher.proxy;

		const lorem = proxy.lorem;
		expect(stackUpdate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				type: CaughtType.Prop,
				interaction: CaughtPropType.Access,
				path: ["lorem"],
			}),
		);

		const ipsum = lorem.ipsum;
		expect(stackUpdate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				type: CaughtType.Prop,
				interaction: CaughtPropType.Access,
				path: ["lorem", "ipsum"],
			}),
		);

		ipsum.foo = {
			bar: 5,
		};
		expect(stackUpdate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				type: CaughtType.Prop,
				interaction: CaughtPropType.Assignment,
				path: ["lorem", "ipsum", "foo"],
				value: { bar: 5 },
			}),
		);

		delete ipsum.foo;
		expect(stackUpdate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				type: CaughtType.Prop,
				interaction: CaughtPropType.Deletion,
				path: ["lorem", "ipsum", "foo"],
			}),
		);

		const bar = ipsum.foo.bar;
		expect(stackUpdate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				type: CaughtType.Prop,
				interaction: CaughtPropType.Access,
				path: ["lorem", "ipsum", "foo", "bar"],
			}),
		);

		expect(bar).toEqual([
			expect.objectContaining({
				type: CaughtType.Prop,
				interaction: CaughtPropType.Assignment,
				path: ["lorem", "ipsum", "foo"],
				value: { bar: 5 },
			}),
			expect.objectContaining({
				type: CaughtType.Prop,
				interaction: CaughtPropType.Deletion,
				path: ["lorem", "ipsum", "foo"],
			}),
			expect.objectContaining({
				type: CaughtType.Prop,
				interaction: CaughtPropType.Access,
				path: ["lorem", "ipsum", "foo", "bar"],
			}),
		]);
	});
});
