import { createPrimServer } from "@doseofted/prim-rpc"
import { defineNextjsAppPrimHandler } from "@doseofted/prim-rpc-plugins/nextjs"
import * as moduleAll from "@doseofted/prim-example"
import jsonHandler from "superjson"

const module = process.env.NODE_ENV === "development" ? moduleAll : { greetings: moduleAll.greetings }
const prim = createPrimServer({ module, jsonHandler })
export const { GET, POST } = defineNextjsAppPrimHandler({ prim })
