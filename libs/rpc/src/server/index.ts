import { UserProvidedServerOptions } from "../options/provided"
import { ResolverServer } from "../resolver/types"

export function createRpcServer<GivenOptions extends UserProvidedServerOptions = UserProvidedServerOptions>(
	_options: GivenOptions
): ResolverServer {
	return () => null
}
