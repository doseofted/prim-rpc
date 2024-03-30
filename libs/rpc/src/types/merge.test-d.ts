import { expectTypeOf, test, describe } from "vitest"
import type { MergeModuleMethods } from "./merge"
import type { RpcModule } from "./rpc-module"

describe("MergeModule merges modules", () => {
	test("override all without new methods", () => {
		type A = {
			lorem(): string
			testing: {
				ipsum(): Promise<void>
			}
		}
		type B = {
			lorem(): number
			testing: {
				ipsum(): void
			}
		}
		type Merged = MergeModuleMethods<A, B>
		expectTypeOf<Merged>().toMatchTypeOf<B>()
	})

	test("with new methods", () => {
		type A = {
			what(): void
			testing: {
				lorem(): string
			}
		}
		type B = {
			testing: {
				ipsum(): void
			}
			cool(): boolean
		}
		type Merged = MergeModuleMethods<A, B>
		type Expected = {
			what(): void
			testing: {
				lorem(): string
				ipsum(): void
			}
			cool(): boolean
		}
		expectTypeOf<Merged>().toMatchTypeOf<Expected>()
	})

	test("without override", () => {
		type A = {
			what(): void
			testing: {
				lorem(): string
			}
		}
		type B = never
		type Merged = MergeModuleMethods<A, B>
		expectTypeOf<Merged>().toMatchTypeOf<A>()
	})

	test("works without base", () => {
		type A = never
		type B = {
			what(): void
		}
		type Merged = MergeModuleMethods<A, B>
		expectTypeOf<Merged>().toMatchTypeOf<B>()
	})
})

describe("MergeModule works with RpcModule", () => {
	test("with form handling", () => {
		type A = RpcModule<
			{
				lorem(): Promise<string>
				ipsum(): void
			},
			true
		>
		type B = {
			lorem(): string
		}
		type Merged = MergeModuleMethods<A, B>
		type Expected = {
			lorem(): string
			ipsum(): Promise<void>
			ipsum(formlike: SubmitEvent | FormData | HTMLFormElement): Promise<void>
		}

		expectTypeOf<Merged>().toMatchTypeOf<Expected>()
	})

	test("without form handling", () => {
		type A = RpcModule<
			{
				lorem(): Promise<string>
				test: {
					ipsum(): void
				}
			},
			false
		>
		type B = {
			lorem(): string
		}
		type Merged = MergeModuleMethods<A, B>
		type Expected = {
			lorem(): string
			test: {
				ipsum(): Promise<void>
			}
		}
		expectTypeOf<Merged>().toMatchTypeOf<Expected>()
	})
})
