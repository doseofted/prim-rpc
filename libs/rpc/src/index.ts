// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

export { createPrimClient } from "./client"
export { createPrimServer } from "./server"
export * as testing from "./testing"

export type {
	// Basic RPC structures
	RpcAnswer,
	RpcCall,
	// Prim-RPC options, both server and client side
	PrimOptions,
	PrimServerOptions,
	// client-side functions for sending RPCs
	PrimClientMethodPlugin,
	PrimClientCallbackPlugin,
	// server-side functions for handling RPCs
	PrimServerMethodHandler,
	PrimServerCallbackHandler,
	// other types that may need to be used from outside of module
	JsonHandler,
	PromiseResolveStatus,
	// needed by plugins or otherwise
	PrimServerEvents,
	BlobRecords,
	// other potentially useful utilities
	AnyFunction,
	PromisifiedModule,
} from "./interfaces"
