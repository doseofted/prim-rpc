import { createPrimServer } from "@doseofted/prim-rpc"
import { createCallbackHandler, createMethodHandler } from "@doseofted/prim-rpc-plugins/web-worker"
import * as module from "./highlight"

const { methodHandler } = createMethodHandler({ worker: self })
const { callbackHandler, jsonHandler } = createCallbackHandler({ worker: self })
createPrimServer({ module, methodHandler, callbackHandler, jsonHandler })

export type { module }
