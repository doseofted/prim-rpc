import type { TransformHandler } from "../options/provided"

// interpreter

type RpcUtilities = {
	url: string
	handler: TransformHandler
}

type ResolverOptions = {
	stream?: boolean | { input: boolean; output: boolean }
}

// eslint-disable-next-line @typescript-eslint/ban-types
type RpcEvents<Server extends boolean = false> = (Server extends true ? ResolverOptions : {}) & {
	connected(this: void): void
	disconnected(this: void): void
	received(this: void, rpc: unknown, extracted?: Record<string, unknown>): void
}

// eslint-disable-next-line @typescript-eslint/ban-types
type RpcActions<Server extends boolean = false> = (Server extends true ? ResolverOptions : {}) & {
	disconnect?: () => void
	send(this: void, rpc: unknown, extracted: Record<string, unknown>): void
}

/** Client-side tool to get result from an RPC  */
export type ResolverClient = (events: RpcEvents, utils: RpcUtilities) => RpcActions<true>
/** Server-side tool to handle given RPCs */
export type ResolverServer = (events: RpcActions, utils: RpcUtilities) => RpcEvents<true>

// const websocketResolver: ResultResolver = (events, utils) => {
//   const ws = new WebSocket(utils.url)
//   ws.addEventListener("open", events.connected)
//   ws.addEventListener("close", events.disconnected)
//   ws.addEventListener("message", events.received)
// 	return {
//     stream: true,
//     send(rpc, _extracted) {
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
//       ws.send(utils.handler.stringify(rpc))
//     },
//     disconnect() {
//       ws.close()
//     },
//   }
// }

// const fetchResolver: ResultResolver = (events, utils) => {
//   return {
//     stream: false,
//     async send(rpc, extracted) {
//       const response = await fetch(utils.url, {
//         method: "POST",
//         headers: {
//           "Content-Type": utils.handler.mediaType,
//         },
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//         body: utils.handler.stringify(rpc),
//       })
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//       const result = await response.json()
//       events.received(result, extracted)
//     },
//   }
// }
