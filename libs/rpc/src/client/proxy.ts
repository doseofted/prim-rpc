import { DeepProxy } from "proxy-deep"

export function proxy() {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return new DeepProxy(
		{},
		{
			apply(target, thisArg, argArray) {
				console.log("apply(regular)", target, this.path, thisArg, argArray)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return promiseProxy<void>(r => r(), this.path)
			},
			get(target, p, receiver) {
				console.log("get(regular)", target, this.path, p, receiver)
				return this.nest(() => {})
			},
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	) as any
}

function isPromiseMethodName(given: PropertyKey): given is "then" | "catch" | "finally" {
	return ["then", "catch", "finally"].includes(given.toString())
}

export function promiseProxy<T>(executor: ConstructorParameters<typeof Promise<T>>["0"], path?: string[]) {
	const basePromise = new Promise(executor)
	return new DeepProxy(
		basePromise,
		{
			apply(target, thisArg, argArray) {
				console.log("apply(promise)", target, this.path, thisArg, argArray)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return promiseProxy(executor, this.path)
			},
			get(target, p, receiver) {
				console.log("get(promise)", target, this.path, p, receiver)
				if (isPromiseMethodName(p)) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return target[p].bind(target)
				}
				return this.nest(() => {})
			},
		},
		// FIXME: DeepProxy options type is wrong (submit PR later)
		{ path: path?.join(".") as unknown as string[] }
	)
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// const a = promiseProxy<void>(r => r())
