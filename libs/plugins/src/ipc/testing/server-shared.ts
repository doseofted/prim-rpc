import { createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler, createCallbackHandler, jsonHandler } from "../web-worker"
import * as exampleModule from "@doseofted/prim-example"

const context = "SharedWorker"

console.log("i'm shared")
createPrimServer({
	module: exampleModule,
	methodHandler: createMethodHandler({ worker: self, context }),
	callbackHandler: createCallbackHandler({ worker: self, context }),
	jsonHandler,
})

export type { exampleModule }

// self.addEventListener("connect", () => {
// 	console.log("WHAT'S UP?")
// })
// self.onconnect = () => {
// 	console.log("WHAT'S UP? 2")
// }
