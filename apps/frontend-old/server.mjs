// @ts-check
import { join as joinPath, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import Fastify from "fastify"
import Static from "@fastify/static"

const app = Fastify()
const projectPath = dirname(fileURLToPath(import.meta.url))
await app.register(Static, {
	root: joinPath(projectPath, "dist"),
})

app.listen({ port: 5173, host: "0.0.0.0" }, (e, addr) => {
	console.log("Listening:", addr)
})
