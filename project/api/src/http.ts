import fastify from "fastify"
import mercurius from "mercurius"
import { schema } from "./graphql"

// initialize server
const app = fastify({ logger: true })

// register needed plugins with server
app.register(mercurius, { schema })

// set up some default routes
app.get('/', (request, reply) => {
	reply.send({ hello: 'world' })
})

export { app }
