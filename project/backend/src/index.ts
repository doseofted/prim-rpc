import Fastify from 'fastify'

const fastify = Fastify({ logger: true })

fastify.get('/', function (request, reply) {
	reply.send({ hello: 'you' })
})

fastify.listen(3001, "0.0.0.0", function (err, address) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})
