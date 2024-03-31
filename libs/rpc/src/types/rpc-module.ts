// import type { ConditionalExcept } from "type-fest"

export type PossibleModule = object

export type WithoutFunctionWrapper<Given> = Given extends (...args: infer _) => infer Returns ? Returns : Given
export type WithoutPromiseWrapper<Given> = Given extends PromiseLike<infer Value> ? Value : Given

// type A = {
// 	test: string
// 	testing: number
// 	tested: never
// }
// type B = {
// 	test: string
// 	testing: number
// 	tested: never
// 	what: {
// 		test(): string
// 		testing: never
// 		tested: symbol
// 		a: {
// 			test: number
// 			here: never
// 		}
// 	}
// }

type OmitNever<T> = {
	[K in keyof T as T[K] extends never ? never : K]: T[K]
}
// eslint-disable-next-line @typescript-eslint/ban-types
type CleanUp<T, Keys extends keyof T = keyof T> = {} & { [Key in Keys]: T[Key] }
type OmitNeverRecursive<T> = {
	[K in keyof T as T[K] extends never ? never : K]: T[K] extends (...args: unknown[]) => unknown
		? T[K]
		: T[K] extends object
			? CleanUp<OmitNeverRecursive<T[K]>>
			: T[K]
}
// type C = OmitNeverRecursive<B>

/** Given the parameters and return value of a function, create a second call signature that supports forms (unless disabled) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FunctionWithFormParameter<Params extends unknown[], Result, F extends true | false = true> = [F] extends [false]
	? {
			(...args: Params): Result
		}
	: {
			(...args: Params): Result
			(formLike: SubmitEvent | FormData | HTMLFormElement): Result
		}

export type RpcModule<
	ModuleGiven extends PossibleModule,
	HandleForm extends true | false = true,
	HandlePromise extends true | false = true,
	Recursive extends true | false = true,
	Root extends true | false = true,
	Keys extends keyof ModuleGiven = Extract<keyof ModuleGiven, string>,
> = [Root] extends [false]
	? // consider usage of `OmitNeverRecursive` if `as` condition doesn't work
		{
			[Key in Keys as ModuleGiven[Key] extends object ? Key : never]: ModuleGiven[Key] extends (
				...args: infer Args
			) => infer Returned
				? FunctionWithFormParameter<
						Args,
						HandlePromise extends true
							? Returned extends Generator<infer G>
								? AsyncGenerator<G>
								: Promise<Awaited<Returned>>
							: Returned,
						HandleForm
					> &
						RpcModule<ModuleGiven[Key], HandleForm, HandlePromise, false, false>
				: ModuleGiven[Key] extends object
					? RpcModule<ModuleGiven[Key], HandleForm, HandlePromise, Recursive, false>
					: never
		}
	: RpcModule<
			WithoutPromiseWrapper<WithoutFunctionWrapper<ModuleGiven>> extends object
				? WithoutPromiseWrapper<WithoutFunctionWrapper<ModuleGiven>>
				: ModuleGiven,
			HandleForm,
			HandlePromise,
			Recursive,
			false
		>
