import { createPrimClient } from "@doseofted/prim-rpc"
import jsonHandler from "superjson"
import type * as exampleClient from "@doseofted/prim-example"

const host = import.meta.env.VITE_WEBSITE_HOST as string
const backend = createPrimClient<typeof exampleClient>({
	endpoint: import.meta.env.VITE_CONTAINED
		? `https://api.${host}/prim`
		: "http://localhost:3001/prim",
	clientBatchTime: 10,
	jsonHandler,
})

export default backend
