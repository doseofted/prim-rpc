import { createPrimClient } from "./client"
import { createPrimServer } from "./server"

export {
	createPrimClient, createPrimServer,
}

export type {
	PrimOptions, RpcAnswer, RpcCall, PrimClientFunction, PrimSocketFunction,
} from "./interfaces"
