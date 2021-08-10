import { objectType, extendType } from 'nexus'

const nameOfType = 'User'

const source = [
	{
		id: 123,
		name: 'Ted',
		email: 'ted@doseofted.com',
		verified: false
	},
	{
		id: 456,
		name: 'Theodor',
		email: 'hi@doseofted.com',
		verified: false
	}
]

export const User = objectType({
	name: nameOfType,
	description: 'A user',
	definition(t) {
		t.int('id')
		t.string('name')
		t.string('email')
		t.boolean('verified')
	},
})

export const UsersQuery = extendType({
	type: 'Query',
	definition(t) {
		t.nonNull.list.field('users', {
			type: nameOfType,
			resolve() {
				return source
			}
		})
	}
})

export const UserQuery = extendType({
	type: 'Query',
	definition(t) {
		t.nonNull.field('user', {
			type: nameOfType,
			resolve() {
				return source[0]
			}
		})
	}
})
