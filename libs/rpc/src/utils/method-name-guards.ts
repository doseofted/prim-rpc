const methodsPromise = ["then", "catch", "finally"] as const;
type MethodsPromise = (typeof methodsPromise)[number];
export function isMethodPromise(
	method?: PropertyKey | null,
): method is MethodsPromise {
	return methodsPromise.includes(method as MethodsPromise);
}

const methodsIteratorShared = ["next", "return", "throw"] as const;
const methodsIterator = [...methodsIteratorShared, Symbol.iterator] as [
	"next",
	"return",
	"throw",
	typeof Symbol.iterator,
];
type MethodsIterator = (typeof methodsIterator)[number];
export function isMethodIterator(
	method?: PropertyKey | null,
): method is MethodsIterator {
	return methodsIterator.includes(method as MethodsIterator);
}

const methodsAsyncIterator = [
	...methodsIteratorShared,
	Symbol.asyncIterator,
] as ["next", "return", "throw", typeof Symbol.asyncIterator];
type MethodsAsyncIterator = (typeof methodsAsyncIterator)[number];
export function isMethodAsyncIterator(
	method?: PropertyKey | null,
): method is MethodsAsyncIterator {
	return methodsAsyncIterator.includes(method as MethodsAsyncIterator);
}
