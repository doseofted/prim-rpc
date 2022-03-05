import { createPrimClient } from "./prim"
import { createPrimServer } from "./server"
import { RpcError } from "./error"

export {
	createPrimClient, createPrimServer, RpcError
}

import type { RpcErr } from "./error"
import type { PrimOptions, RpcAnswer, RpcCall } from "./common.interface"

export type {
	PrimOptions, RpcAnswer, RpcCall, RpcErr
}
