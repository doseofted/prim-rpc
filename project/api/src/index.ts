import fastify from "fastify"
import { MikroORM } from "@mikro-orm/core";

async function initORM () {
  const { DATABASE_USER: username, DATABASE_PASS: password } = process.env
  try {
    const orm = await MikroORM.init({
      entities: [],
      dbName: 'prim',
      type: 'postgresql',
      clientUrl: `postgresql://${username}:${password}@dbsql:5432`,
    });
    console.log(orm);
    return orm;
  } catch (error) {
    console.log(error.message);
  }
}

const app = fastify({ logger: true })

app.get('/', (request, reply) => {initORM()
  reply.send({ hello: 'world' })
})

app.listen(3001, '0.0.0.0', (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`server listening on ${address}`)
})
