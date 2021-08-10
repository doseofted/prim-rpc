import { makeSchema } from 'nexus'
import { User, UserQuery, UsersQuery } from './create'
import path from 'path'

const schema = makeSchema({
	types: [User, UserQuery, UsersQuery],
	outputs: {
		// NOTE: consider making false when generating types dynamically
		typegen: path.join(__dirname, 'nexus-typegen.ts'),
		schema: path.join(__dirname, 'schema.graphql'),
	},
})

export { schema }
