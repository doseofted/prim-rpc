/**
 * This package should take a JSON-RPC call and translate it into a function
 * call in JavaScript. This way server-side code can be written in plain
 * JavaScript (or chosen variant/superscript) and used as needed or even
 * shared with the client (if needed, of course only non-sensitive portions).
 * 
 * The point is, when writing code I shouldn't have to write it for a specific
 * framework. It would be easier if I could just write the function and
 * then the server-side version of that is generated for me.
 * 
 * Ideally, Prim (the server-side aspect, not data-management portion) will allow
 * me to write plain JavaScript, where that will be given to the Prim server which
 * will generate JSON-RPC calls for them, along with a JSON-Schema for things like
 * arguments to those functions or the expected data type to be returned.
 * This would allow me to take that JSON and automatically build out a client and
 * typescript definitions. The client could then be generated from having the
 * server-side code available (for instance in a monorepo, however some server-side
 * code can't be shared so this may not work) or by having the JSON RPC and schemas
 * available from the server to generate a new client from this JSON.
 */

interface RpcBase {
	jsonrpc: "2.0"
	id: null | string | number
}

interface RpcError<T = unknown> {
	code: number
	message: string
	data?: T
}

interface RpcCall<T = unknown> extends RpcBase {
	method: string
	params?: T
}

interface RpcAnswer<T = unknown> extends RpcBase {
	result?: T
	error?: RpcError
}

/**
 * This should accept a given module and then return a function which can resolve
 * a JSON-RPC call and then return data that matches a certain schema, with linked
 * data being formatted with JSON-LD.
 *
 * The Prim function should be called once a module is ready to be called.
 * The resulting, curried function should be used as middleware or a plugin
 * in a server framework like Koa/Fastify in Node or Koa in Deno. Regardless,
 * the framework should have no preference for one particular framework so it
 * should be easy to integrate into another framework if one is requested.
 * 
 * Those middleware/plugin functions should probably form a separate library from
 * Prim.
 */
export function prim(givenModule: object) {
	const givenNames = Object.keys(givenModule)
	console.log(givenNames)
	return function (rpcCall: RpcCall): RpcAnswer {
		const { jsonrpc, id, method, params } = rpcCall
		// TODO: match module functions with RPC call
		try {
			// TODO: consider supporting positional arguments too
			const result = Array.isArray(params) ? givenModule[method](...params) : givenModule[method](params)
			return { jsonrpc, id, result }
		} catch (e) {
			if (e instanceof Error) {
				const { message, name } = e
				// TODO: figure good way to handle unique error codes
				const error = { message, name, code: -1 }
				return { jsonrpc, id, error }
			} else {
				// For now Prim will error out if errors aren't properly handled
				// which is kinda harsh. I might just return an error response instead.
				throw new Error("Prim could not understand the response.")
			}
		}
	}
}
