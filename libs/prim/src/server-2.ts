/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { RpcError } from "./error"
import { AnyFunction, createPrimClient } from "./client"
import { CommonFrameworkOptions, PrimOptions, PrimWebSocketEvents, RpcAnswer, RpcCall } from "./interfaces"
import { get as getProperty } from "lodash-es"
import { defu } from "defu"
import { nanoid } from "nanoid"
import { getQuery, parseURL } from "ufo"
import mitt, { Emitter } from "mitt"
import { createPrimOptions } from "./options"

// TODO: make this work with methods called in path over GET request
// the function should be restructured to accept: path, body, querystring
// and handle conditions like querystring in path, or body not being converted to string yet

export interface PrimServer {
	rpc: (given: CommonFrameworkOptions) => Promise<RpcAnswer|RpcAnswer[]>
	ws: Emitter<PrimWebSocketEvents>
	// TODO: consider alternate way of passing options to websocket plugin on server,
	// since they can't be modified here (because they've already been used)
	opts: PrimOptions
}

/**
 * Unlike `createPrimClient()`, this function is designed purely for the server. Rather than integrating directly with a
 * server framework, it is meant to be given a JSON body expected for the RPC call and return the result as an RPC
 * answer. The integration with a server framework is just a wrapper around this function that prepares the RPC calls
 * and then does any processing needed (if any) before returning the result back.
 * 
 * @param options Options for utilizing functions provided with Prim
 * @param givenModule If `options.server` is true, provide the module where functions should be resolved
 * @returns A function that expects JSON resembling an RPC call
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPrimServer<
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	ModuleType extends OptionsType["module"] = object,
	OptionsType extends PrimOptions = PrimOptions,
>(options?: PrimOptions): PrimServer {

}