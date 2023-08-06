import { createPrimClient, createPrimServer } from "@doseofted/prim-rpc"
import {
	createMethodPlugin,
	createCallbackPlugin,
	jsonHandler,
	createMethodHandler,
	createCallbackHandler,
} from "../web-worker"
import type * as exampleModule from "@doseofted/prim-example"

const methodPlugin = createMethodPlugin({ worker: self, context: "WebWorker" })
const callbackPlugin = createCallbackPlugin({ worker: self, context: "WebWorker" })

// this is the intended client
const client = createPrimClient<typeof exampleModule>({
	methodPlugin,
	callbackPlugin,
	jsonHandler,
	clientBatchTime: 0,
})

// this server is just to use the client from the test suite
// NOTE: using Prim to test itself may be problematic (?) but it's the easiest way to test the client
createPrimServer<typeof client>({
	module: client,
	methodHandler: createMethodHandler({ worker: self, context: "WebWorker" }),
	callbackHandler: createCallbackHandler({ worker: self, context: "WebWorker" }),
	jsonHandler,
	// NOTE: I've given the Prim RPC server a proxy where it doesn't know if .rpc is defined
	// (because it's making a "remote" call back to the main thread) so I have to tell it what's allowed again
	allowList: {
		sayHello: true,
		sayHelloAlternative: true,
		oops: true,
		whatIsDayAfter: true,
		takeYourTime: true,
		testLevel1: {
			sayHello: true,
		},
		testLevel2: {
			testLevel1: {
				sayHelloAlternative: true,
			},
		},
	},
})
