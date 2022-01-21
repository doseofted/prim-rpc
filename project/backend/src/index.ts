import Fastify from 'fastify'
import { you } from "example"

const fastify = Fastify({ logger: true })

fastify.get('/', function (request, reply) {
	reply.send({ Hello: you })
})

fastify.listen(3001, "0.0.0.0", function (err, address) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})
