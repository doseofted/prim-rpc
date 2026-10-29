import { createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler, createCallbackHandler, jsonHandler } from "../web-worker"
import * as exampleModule from "@doseofted/prim-example"

const context = "WebWorker"

createPrimServer({
	module: exampleModule,
	methodHandler: createMethodHandler({ worker: self, context }),
	callbackHandler: createCallbackHandler({ worker: self, context }),
	jsonHandler,
})

export type { exampleModule }
