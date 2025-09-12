import { createPrimServer } from "@doseofted/prim-rpc"
import { primFetch } from "@doseofted/prim-rpc-plugins/server-fetch"
import * as module from "./module"

// Server routes are automatically created for your functions
export default primFetch({
	prim: createPrimServer({ module }),
})
export type Module = typeof module
