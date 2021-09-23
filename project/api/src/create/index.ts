
// this is an example of the type of structure that should be used with Prim

import { EntitySchema } from "@mikro-orm/core"

export const exampleThing = {
	"identifiers": {
		// identifiers and other details concerning the created type
		"name": "user",
		"description": "An app user"
	},
	"behaviors": {
		"before": {
			"find": {
				"userLoggedIn": ["username", "password"]
			},
			"create": {
				// generic functions should be encroused, passing relevant property names as needed
				"verifyEmail": ["username"]
			}
		}
	},
	"properties": {
		"username": {
			// built from scalar type
			"type": "string",
			"required": true,
			"identifiers": {
				"name": "username",
				"description": "An email is used as the username"
			},
			"validation": {
				// validations are for scalar types
				"minlength": [1],
				"maxlength": [100],
				"lowercase": [true],
				"match": ["[\\w-]*"],
				"email": [true]
			}
		},
		"host": {
			// built from other created types
			"type": "user",
			"required": true,
			"identifiers": {
				"name": "host",
				"description": "A reference to the user who who invited this user."
			},
			"validation": {
				"exists": true
			}
		}
	}
}

new EntitySchema({
	name: "Test"
})

/* function createNewType(json: any) {
	const { behaviors, identifiers, properties  } = exampleThing
} */
