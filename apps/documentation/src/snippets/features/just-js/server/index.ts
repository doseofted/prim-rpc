import { createPrimServer } from "@doseofted/prim-rpc"
import { primFetch } from "@doseofted/prim-rpc-plugins/server-fetch"
import * as module from "./module"

const prim = createPrimServer({ module })
export default primFetch({ prim })

export type Module = typeof module
