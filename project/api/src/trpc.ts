import * as trpc from "@trpc/server"
import * as trpcExpress from "@trpc/server/adapters/express"
import { z } from "zod"

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const createContext = (context: trpcExpress.CreateExpressContextOptions) => ({}) // no context
const appRouter = trpc.router()
	.query("getUser", {
		input: z.string(),
		async resolve(req) {
			req.input // string
			return { id: req.input, name: "Bilbo" }
		},
	})
	.mutation("createUser", {
		// validate input with Zod
		input: z.object({ name: z.string().min(5) }),
		async resolve(req) {
			// use your ORM of choice
			return {
				data: req.input,
			}
		},
	})

export { trpcExpress, createContext, appRouter }
export type AppRouter = typeof appRouter
export type Context = trpc.inferAsyncReturnType<typeof createContext>
