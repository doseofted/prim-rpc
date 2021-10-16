import { makeSchema } from "nexus"
import { createTypes } from "./create"
import path from "path"

const schema = makeSchema({
	types: [...createTypes],
	outputs: {
		// NOTE: consider making false when generating types dynamically
		typegen: path.join(__dirname, "nexus-typegen.ts"),
		schema: path.join(__dirname, "schema.graphql"),
	},
})

export { schema }
