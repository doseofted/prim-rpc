import { createPrimServer } from "@doseofted/prim-rpc"
import { defineNextjsAppHandler } from "@doseofted/prim-rpc-plugins/nextjs"
import * as moduleAll from "@doseofted/prim-example"
import jsonHandler from "superjson"

const module = process.env.NODE_ENV === "development" ? moduleAll : { sayHello: moduleAll.sayHello }
const prim = createPrimServer({ module, jsonHandler })
export const { GET, POST } = defineNextjsAppHandler({
	prim,
	headers: {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	},
})
