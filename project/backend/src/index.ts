import Fastify from 'fastify'

const fastify = Fastify({ logger: true })

fastify.get('/', function (request, reply) {
	reply.send({ hello: 'world' })
})

fastify.listen(3001, function (err, address) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})
