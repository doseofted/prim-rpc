import { createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler, createCallbackHandler, jsonHandler } from "../web-worker"
import * as exampleModule from "@doseofted/prim-example"

createPrimServer({
	module: exampleModule,
	methodHandler: createMethodHandler({ worker: self }),
	callbackHandler: createCallbackHandler({ worker: self }),
	jsonHandler,
})

export type { exampleModule }
