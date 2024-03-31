// import type { ConditionalExcept } from "type-fest"

export type PossibleModule = object

export type WithoutFunctionWrapper<Given> = Given extends (...args: infer _) => infer Returns ? Returns : Given
export type WithoutPromiseWrapper<Given> = Given extends PromiseLike<infer Value> ? Value : Given

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
	? {
			[Key in Keys as ModuleGiven[Key] extends object ? Key : never]: ModuleGiven[Key] extends (
				...args: infer Args
			) => infer Returned
				? FunctionWithFormParameter<
						Args,
						HandlePromise extends true
							? Returned extends Generator<infer G> | AsyncGenerator<infer G>
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
