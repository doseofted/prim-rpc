import { createPrimClient } from "./client"
import { createPrimServer } from "./server"

export {
	createPrimClient,
	createPrimServer,
}

export type {
	// Basic RPC structures
	RpcAnswer, RpcCall,
	// Prim-RPC options, both server and client side
	PrimOptions, PrimServerOptions,
	// client-side functions for sending RPCs
	PrimClientFunction, PrimSocketFunction,
	// server-side functions for handling RPCs
	PrimServerMethodHandler, PrimServerSocketHandler,
} from "./interfaces"
