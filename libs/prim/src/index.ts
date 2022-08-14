import { createPrimClient } from "./client"
import { createPrimServer } from "./server"
import { RpcError } from "./error"

export {
	createPrimClient, createPrimServer, RpcError,
}

import type { RpcErr } from "./error"
import type { PrimOptions, RpcAnswer, RpcCall, PrimClientFunction, PrimSocketFunction } from "./interfaces"
import type { PrimServer } from "./server"

export type {
	PrimOptions, RpcAnswer, RpcCall, PrimClientFunction, PrimSocketFunction, RpcErr, PrimServer,
}
