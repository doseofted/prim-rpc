import { ResolverServer } from "../../resolver/types"
import type { PossibleModule } from "../../types/rpc-module"
import type { UserProvidedClientOptions } from "../client/provided"

export interface UserProvidedServerOptions<
	GivenModule extends PossibleModule = PossibleModule,
	FormHandling extends boolean = boolean,
> extends UserProvidedClientOptions<GivenModule, FormHandling> {
	/**
	 * A plugin (or list of available plugins) used to receive RPC and send RPC results.
	 */
	resolverServer?: ResolverServer | ResolverServer[]
}
