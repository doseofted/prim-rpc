import type { ProvidedServerOptions } from "../options/provided"
import type { ResolverServer } from "../resolver/types"

export function createRpcServer<GivenOptions extends ProvidedServerOptions = ProvidedServerOptions>(
	_options: GivenOptions
): ResolverServer {
	return () => null
}

// import { WebSocketServer } from "ws"
// const wss = new WebSocketServer({ port: 1234 })

// function createResolver(wss: WebSocketServer): ResolverServer {
// 	wss.on("connection", ws => {})
// 	return (events, utils) => {
// 		return {
// 			connected() {},
// 			received(rpc, extracted) {},
// 			disconnected() {},
// 		}
// 	}
// }

// const server = createRpcServer({
// 	module: {
// 		hello() {
// 			return "Hello!"
// 		},
// 	},
// 	allowSchema: { hello: true },
// 	resolverServer: createResolver(wss),
// })
