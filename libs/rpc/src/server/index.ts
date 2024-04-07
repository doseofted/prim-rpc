import { send } from "process"
import { UserProvidedClientOptions } from "../options/client/provided"
import { ResolverServer } from "../resolver/types"

export function createRpcServer<GivenOptions extends UserProvidedClientOptions = UserProvidedClientOptions>(
	options: GivenOptions
): ResolverServer {
	return () => null
}
