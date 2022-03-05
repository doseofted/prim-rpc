import Fastify from "fastify"
import Cors from "fastify-cors"
import * as example from "example"
import { primFasifyPlugin } from "prim-plugins"

const fastify = Fastify({ logger: true })
fastify.register(primFasifyPlugin, { module: example })
fastify.register(Cors, { origin: `https://${process.env.HOST}` })

fastify.listen(3001, "0.0.0.0", function (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})
