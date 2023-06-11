import { createPrimServer } from "@doseofted/prim-rpc"
import { defineNextjsAppHandler } from "@doseofted/prim-rpc-plugins/nextjs-app"
import * as module from "@doseofted/prim-example"
import jsonHandler from "superjson"

const prim = createPrimServer({ module, jsonHandler })
export const { GET, POST } = defineNextjsAppHandler({ prim })
