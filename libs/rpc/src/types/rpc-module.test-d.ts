// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { expectTypeOf, test, describe } from "vitest"
import type { RpcModule } from "./rpc-module"

describe("RpcModule produces expected types for developer", () => {
	test("with regular module", () => {
		type Module = {
			lorem(): string
			testing: {
				ipsum(): Promise<number>
			}
		}
		type ProducedModule = RpcModule<Module>
		type ExpectedModule = {
			lorem(): Promise<string>
			lorem(form: SubmitEvent | FormData | HTMLFormElement): Promise<string>
			testing: {
				ipsum(): Promise<number>
				ipsum(formLike: SubmitEvent | FormData | HTMLFormElement): Promise<number>
			}
		}
		expectTypeOf<ProducedModule>().toMatchTypeOf<ExpectedModule>()
	})

	test("with dynamically imported module, in a function", () => {
		type Module = () => Promise<{
			lorem(): string
			testing: {
				ipsum(): Promise<number>
			}
		}>
		type ProducedModule = RpcModule<Module>
		type ExpectedModule = {
			lorem(): Promise<string>
			lorem(form: SubmitEvent | FormData | HTMLFormElement): Promise<string>
			testing: {
				ipsum(): Promise<number>
				ipsum(formLike: SubmitEvent | FormData | HTMLFormElement): Promise<number>
			}
		}
		expectTypeOf<ProducedModule>().toMatchTypeOf<ExpectedModule>()
	})

	test("without form signatures or promised return modifications", () => {
		type Module = () => Promise<{
			a: {
				b: {
					c(test: number): string
				}
				lol: string
			}
			what: string
		}>
		type ProducedModule = RpcModule<Module, false, false>
		type ExpectedModule = {
			a: {
				b: {
					c(test: number): string
				}
			}
		}
		expectTypeOf<ProducedModule>().toMatchTypeOf<ExpectedModule>()
	})

	test("with potential synchronous generator in module", () => {
		type Module = () => Promise<{
			a: {
				alreadyAsync(): AsyncGenerator<string>
				generator(test: number): Generator<string>
				property: {
					here: string
					somethingElse: number
				}
			}
		}>
		type ProducedModule = RpcModule<Module>
		type ExpectedModule = {
			a: {
				alreadyAsync(): AsyncGenerator<string>
				alreadyAsync(test: SubmitEvent | FormData | HTMLFormElement): AsyncGenerator<string>
				generator(test: number): AsyncGenerator<string>
				generator(test: SubmitEvent | FormData | HTMLFormElement): AsyncGenerator<string>
				// eslint-disable-next-line @typescript-eslint/ban-types
				property: {}
			}
		}
		expectTypeOf<ProducedModule>().toMatchTypeOf<ExpectedModule>()
	})
})
