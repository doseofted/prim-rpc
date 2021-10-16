import { objectType, queryField } from "nexus"

const Identifier = objectType({
	name: "Identifier",
	description: "Identifiers used in different contexts, such as internally or in a sentence.",
	definition(t) {
		t.string("app", { description: "Identifier as used by an app, not reader-friendly" })
		t.string("friendly", {description: "Name as used in conversation, reader-friendly" })
	}
})

const Thing = objectType({
	name: "Thing",
	description: "A thing",
	definition(t) {
		t.field("identifier", { type: Identifier, description: "Identifier for a thing" })
	}
})

const Query = queryField("create", {
	description: "Create a thing",
	type: Thing
})

const types = [
	Query,
	Thing,
	Identifier
]

export { types as createTypes }