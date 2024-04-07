import { ProvidedServerOptions } from "../options/provided"
import { ResolverServer } from "../resolver/types"

export function createRpcServer<GivenOptions extends ProvidedServerOptions = ProvidedServerOptions>(
	_options: GivenOptions
): ResolverServer {
	return () => null
}

// createRpcServer({
// 	module: {
// 		hello() {
// 			return "Hello!"
// 		},
// 	},
// 	allowSchema: { hello: true },
// })
