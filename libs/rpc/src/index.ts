export { createPrimClient } from "./client"
export { createPrimServer } from "./server"

export type {
	// Basic RPC structures
	RpcAnswer,
	RpcCall,
	// Prim-RPC options, both server and client side
	PrimOptions,
	PrimServerOptions,
	// client-side functions for sending RPCs
	PrimClientFunction,
	PrimSocketFunction,
	// server-side functions for handling RPCs
	PrimServerMethodHandler,
	PrimServerCallbackHandler,
	// other types that may need to be used from outside of module
	JsonHandler,
	PromiseResolveStatus,
	// needed by plugins or otherwise
	PrimServerEvents,
	BlobRecords,
} from "./interfaces"
