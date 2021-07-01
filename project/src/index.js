import * as fastify from "fastify"

const app = fastify({ logger: true, http2: false })

app.get('/', (request, reply) => {
  reply.send({ hello: 'world' })
})

app.listen(3000, '0.0.0.0', (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`server listening on ${address}`)
})
