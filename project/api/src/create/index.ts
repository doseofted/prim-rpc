import { objectType, extendType, nonNull, inputObjectType } from "nexus"

const nameOfType = "User"

const source = [
	{
		id: 123,
		name: "Ted",
		email: "ted@doseofted.com",
		verified: false
	},
	{
		id: 456,
		name: "Theodor",
		email: "hi@doseofted.com",
		verified: false
	}
]

export const User = objectType({
	name: nameOfType,
	description: "A user",
	definition(t) {
		t.int("id")
		t.string("name")
		t.string("email")
		t.boolean("verified")
	},
})

export const UserInput = inputObjectType({
	name: "UserInput",
	description: "A user input",
	definition(t) {
		t.nullable.int("id")
		t.nullable.string("name")
		t.nullable.string("email")
		t.nullable.boolean("verified")
	},
})

export const UsersQuery = extendType({
	type: "Query",
	definition(t) {
		t.nonNull.list.field("users", {
			type: nameOfType,
			resolve() {
				return source
			}
		})
	}
})

export const UserQuery = extendType({
	type: "Query",
	definition(t) {
		t.nonNull.field("user", {
			type: nameOfType,
			resolve() {
				return source[0]
			}
		})
	}
})

export const UserMutation = extendType({
	type: "Mutation",
	definition(t) {
		t.nonNull.field("createUser", {
			type: nameOfType,
			args: {
				data: nonNull(UserInput)
			},
			resolve(_root, args, ctx) {
				source[0] = { ...source[0], ...args.data }
				console.log(args, source)
				return source[0]
			},
		})
	},
})

export const UserTypes = [User, UsersQuery, UserQuery, UserMutation]