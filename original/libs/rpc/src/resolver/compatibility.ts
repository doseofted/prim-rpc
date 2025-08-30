import type { PrimClientCallbackPlugin, PrimClientMethodPlugin } from "../interfaces"
import type { RpcAnswer, RpcCall } from "../types/rpc-structure"
import type { ResolverClient } from "./types"

/** Convert a callback plugin (old style) into a universal RPC resolver (new style) */
export function fromCallbackPlugin(given: PrimClientCallbackPlugin) {
	return ((events, utils) => {
		// eslint-disable-next-line @typescript-eslint/unbound-method
		const { connected, disconnected: ended, received } = events
		const response = (answer: RpcAnswer) => received(answer, {})
		const { send, close: disconnect } = given(utils.url, { connected, ended, response }, utils.handler)
		const stream = { input: false, output: true }
		return { send, disconnect, stream }
	}) satisfies ResolverClient
}

/** Convert a method plugin (old style) into a universal RPC resolver (new style) */
export function fromMethodPlugin(given: PrimClientMethodPlugin) {
	return ((events, utils) => {
		// `connected()` and `disconnected()` are not needed when `streaming` is `false`
		// eslint-disable-next-line @typescript-eslint/unbound-method
		const { received } = events
		const { url, handler } = utils
		return {
			async send(rpc, extracted) {
				const { result, blobs } = await given(url, rpc as RpcCall, handler, extracted as Record<string, Blob>)
				received(result, blobs)
			},
			stream: false,
		}
	}) satisfies ResolverClient
}
