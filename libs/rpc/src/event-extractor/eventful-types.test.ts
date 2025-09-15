import { expect, test } from "vitest";
import {
	EventfulFunction,
	EventfulIterator,
	EventfulPromise,
} from "./eventful-types";

test("EventfulPromise can identify Promises and generate IDs", async () => {
	const eventfulPromise = new EventfulPromise();
	const promised = Promise.resolve(123);
	const id1 = eventfulPromise.isMatch(Promise.resolve());
	const id2 = eventfulPromise.isMatch("not a promise");

	expect(id1).toBe("p1");
	expect(id2).toBe(false);
	await promised;
});

test("EventfulIterator can identify Iterators and generate IDs", () => {
	const eventfulIterator = new EventfulIterator();
	const arrayIterator = [1, 2, 3][Symbol.iterator]();
	const id1 = eventfulIterator.isMatch(arrayIterator);
	const id2 = eventfulIterator.isMatch("not an iterator");

	expect(id1).toBe("i1");
	expect(id2).toBe(false);
});

test("EventfulFunction can identify Functions and generate IDs", () => {
	const eventfulFunction = new EventfulFunction();
	const func = () => {};
	const id1 = eventfulFunction.isMatch(func);
	const id2 = eventfulFunction.isMatch("not a function");

	expect(id1).toBe("f1");
	expect(id2).toBe(false);
});
