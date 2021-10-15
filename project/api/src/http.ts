import Fastify from "fastify"
import mercurius from "mercurius"
import { schema } from "./graphql"
import middie from "fastify-express"
import { appRouter, createContext, trpcExpress } from "./trpc"

async function setupServer () {
	// initialize server
	const app = Fastify({ logger: true })
	// register needed plugins with server
	const devMode = process.env.NODE_ENV === "development"
	// NOTE: graphiql registers service worker which means I cannot use over HTTPS unless cert is valid
	app.register(mercurius, { schema, graphiql: devMode })
	await app.register(middie)
	// express/connect middleware
	app.use("/trpc", trpcExpress.createExpressMiddleware({
		router: appRouter,
		createContext
	}))
	return app
}
const app = await setupServer()

// set up some default routes
app.get("/", (request, reply) => {
	reply.send({ hello: "you" })
})

export { app }
