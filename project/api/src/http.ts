import fastify from "fastify"
import mercurius from "mercurius"
import { schema } from "./graphql"

// initialize server
const app = fastify({ logger: true })

// register needed plugins with server
const devMode = process.env.NODE_ENV === "development"
// NOTE: graphiql registers service worker which means I cannot use over HTTPS unless cert is valid
app.register(mercurius, { schema, graphiql: devMode })

// set up some default routes
app.get("/", (request, reply) => {
	reply.send({ hello: "world" })
})

export { app }
