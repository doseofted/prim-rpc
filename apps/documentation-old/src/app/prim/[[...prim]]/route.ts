import { createPrimServer } from "@doseofted/prim-rpc"
import { defineNextjsAppPrimHandler } from "@doseofted/prim-rpc-plugins/nextjs"
import * as moduleAll from "@doseofted/prim-example"
import jsonHandler from "superjson"

const prim = createPrimServer({
	module: process.env.NODE_ENV === "development" ? moduleAll : { greetings: moduleAll.greetings },
	jsonHandler,
})

export const { GET, POST } = defineNextjsAppPrimHandler({ prim })
