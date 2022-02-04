import defu from "defu"
import { ref, Ref, toRefs, watchEffect } from "vue"
import * as example from "./example"
interface RpcBase {
	id?: string|number
}

interface RpcError<Data = unknown> {
	code: number
	message: string
	data?: Data
}

interface RpcCall<Method = string, Params = unknown> extends RpcBase {
	method: Method
	params?: Params
}

interface RpcAnswer<Result = unknown, Error = unknown> extends RpcBase {
	result?: Result
	error?: RpcError<Error>
}

interface PrimOptions<Module> {
	endpoint: string
	client: <T = unknown>(jsonBody: RpcCall) => Promise<RpcAnswer<T>>
}

// type GenericFunction = <A, B>(...params: A[]) => B
export function prim<T extends Record<keyof T, T[V]>, V extends keyof T = keyof T>(givenModule?: Partial<T>, options?: PrimOptions<Partial<T>>) {
	// first initialize options
	const opts: PrimOptions<Partial<T>> = defu<PrimOptions<Partial<T>>, PrimOptions<Partial<T>>>(options, {
		endpoint: "/prim",
		client: async (jsonBody) => {
			const result = await fetch(opts.endpoint, {
				method: "POST",
				body: JSON.stringify(jsonBody)
			})
			return result.json()
		}
	})
	// now return function that can be used client or server-side
	return <A extends V>(method: A, ...params: Parameters<T[A]>): Ref<ReturnType<T[A]>> => {
		const rpc: RpcCall = { method: String(method), params }
		const answer = ref<ReturnType<T[A]>>(givenModule?.[method](...params))
		opts.client<ReturnType<T[A]>>(rpc).then(a => { answer.value = a })
		return answer.value as Ref<ReturnType<T[A]>>
		// TODO: consider returning reactive value so that value can be updated once client is done
		// return givenModule?.[method](...params)
	}
}

const a = {
	hello: (you: string, greeting?: string) => `${greeting ?? "Hello"} ${you}!`,
	given: ({ greeting, you }: { you: string, greeting: string }) => ({ you, greeting })
} // just a regular module, usually imported
const b = prim<typeof a>({
	hello: () => "Loading your data ..." // set default answer until server receives responses
}) // client-side
const c = prim(example) // server-side (also, using imported module similar to `a`)
const r = b("hello", "Ted", "Hello")
const {greeting, you} = toRefs(c("given", {greeting: "Yo", you: "Ted"}).value)
watchEffect(() => {
	console.log(r.value, greeting.value, you.value)
})

