import { RpcCall } from ".."

/** Don't use: too many nested objects that need to be iterated on */
export const exampleCallVariant1 = [
	{
		method: "select/from",
		args: ["users"],
		chain: {
			method: "where",
			args: ["id", "=", 1],
			chain: {
				method: "execute",
				args: [],
				id: 1,
			},
		},
	},
]

/**
 * Pros:
 * - doesn't change structure of RPC or library logic
 * - defaults to direct method calls, chain is optional
 *
 * Cons:
 * - Root method call is not given in chain, lives outside of it
 *   - That could also be considered a benefit in some cases
 */
export const exampleCallVariant2: RpcCall[] = [
	{
		id: 1,
		method: "select/from",
		args: ["users"],
		chain: [
			{
				method: "where",
				args: ["id", "=", 1],
			},
			{
				method: "execute",
				args: [],
			},
		],
	},
]

/**
 * Pros:
 * - Easy to read and understand
 *
 * Cons:
 * - Requires structural change to RPC across library (RPC call is now a union)
 * - Makes manual RPC calls slightly more difficult to explain in docs (and to learn)
 * - Missing root "method" and "args" could be confusing to end user making manual call
 */
export const exampleCallVariant3: Partial<RpcCall>[] = [
	{
		id: 1,
		chain: [
			{
				method: "select/from",
				args: ["users"],
			},
			{
				method: "where",
				args: ["id", "=", 1],
			},
			{
				method: "execute",
				args: [],
			},
		],
	},
]
