import { RpcEventEncoder } from "./rpc/event-encoder";
import { RpcGenerator } from "./rpc-generator";
import { type PartialSchema, RpcInterpreter } from "./rpc-interpreter";

class PrimRpc<Module = unknown> {
	server: RpcInterpreter<unknown>;
	client: RpcGenerator<Module>;
	constructor(options: RpcOptions<Module> = {}) {
		this.server = new RpcInterpreter(
			options.module,
			options.allowSchema,
			options.allowMethodList,
		);
		const rpcEvents = new RpcEventEncoder(true, true, true);
		this.client = new RpcGenerator((stack, skip) => {
			const rpc = stack.at(-1);
			const [replacedRpc, extractedEvents] = rpcEvents.extract(rpc);
			console.log(replacedRpc, extractedEvents);
			return skip;
		});
	}
}

type RpcOptions<Module = unknown> = {
	module?: Module;
	allowSchema?: PartialSchema<Module>;
	allowMethodList?: string[];
};

type RpcClientOptions = {
	// a locally provided module may override or be called in addition to module
	localModule?: unknown;
	// if a local module is called, there may be multiple strategies for handling
	// both the local call and the remote module call
	syncMethod?: (given: unknown) => Promise<unknown>;
};

// biome-ignore lint/complexity/noBannedTypes: not known what options will be passed yet
type RpcServerOptions = {};

// idea: the server and client are created with the same function
// and their functionality depends on whether a module is passed to them and
// what you expose for usage to either the server or client
export function createRpc(options?: RpcOptions) {
	const _rpc = new PrimRpc(options);
	// note: this is just an idea, these classes will likely need wrappers
	return {
		createClient(_clientOptions: RpcClientOptions): void {
			// new instance of a client should be created (multiple clients could be created without initializing all options again)
			return; // rpc.client.proxy;
		},
		createServer(_serverOptions: RpcServerOptions): void {
			// new instance of a server should be created (this is a new request)
			return; // rpc.server.callChain
		},
	};
}
