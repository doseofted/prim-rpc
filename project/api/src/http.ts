import Fastify from "fastify"
import mercurius from "mercurius"
import { schema } from "./graphql"

async function setupServer () {
	// initialize server
	const app = Fastify({ logger: true })
	// register needed plugins with server
	app.register(mercurius, { schema, graphiql: true })
	return app
}
const app = await setupServer()

// set up some default routes
app.get("/", (request, reply) => {
	reply.send({ hello: "you" })
})

export { app }
