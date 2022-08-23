import { createPrimClient } from "./client"
import { createPrimServer } from "./server"
import { PromiseResolveStatus } from "./interfaces"

export {
	createPrimClient,
	createPrimServer,
	// TODO: remove this export without breaking prim-plugins package
	PromiseResolveStatus,
}

export type {
	// Basic RPC structures
	RpcAnswer, RpcCall,
	// Prim-RPC options, both server and client side
	PrimOptions, PrimServerOptions,
	// client-side functions for sending RPCs
	PrimClientFunction, PrimSocketFunction,
	// server-side functions for handling RPCs
	PrimServerMethodHandler, PrimServerCallbackHandler,
} from "./interfaces"
