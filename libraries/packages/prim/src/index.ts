import { createPrimClient } from "./prim"
import { createPrimServer } from "./server"
import { RpcError } from "./error"

export {
	createPrimClient, createPrimServer, RpcError
}

import type { RpcErr } from "./error"
import type { PrimOptions, RpcAnswer, RpcCall } from "./interfaces"
import type { PrimServer } from "./server"

export type {
	PrimOptions, RpcAnswer, RpcCall, RpcErr, PrimServer
}
