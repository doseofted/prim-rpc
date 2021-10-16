import { arg, inputObjectType, mutationField, objectType, queryField } from "nexus"
import { InputDefinitionBlock, ObjectDefinitionBlock } from "nexus/dist/blocks"

function identifierDefinition<T extends string>(t: InputDefinitionBlock<T> | ObjectDefinitionBlock<T>) {
	t.string("app", { description: "Identifier as used by an app, not reader-friendly" })
	t.string("friendly", { description: "Name as used in conversation, reader-friendly" })
}

const Identifier = objectType({
	name: "Identifier",
	description: "Identifiers used in different contexts, such as internally or in a sentence.",
	definition: identifierDefinition
})

const IdentifierInput = inputObjectType({
	name: "IdentifierInput",
	description: "Identifiers used in different contexts, such as internally or in a sentence.",
	definition: identifierDefinition
})

const ThingInput = inputObjectType({
	name: "ThingInput",
	description: "A thing",
	definition(t) {
		t.field("identifier", { type: IdentifierInput, description: "Identifier for a thing" })
	}
})

const Thing = objectType({
	name: "Thing",
	definition(t) {
		t.field("identifier", { type: Identifier, description: "Identifier for a thing" })
	}
})

const testData = {
	identifier: {
		app: "",
		friendly: ""
	}
}

const Mutation = mutationField("createThing", {
	type: Thing,
	description: "Create a thing",
	args: {
		thing: arg({ type: ThingInput })
	},
	resolve(root, args, ctx) {
		console.log(args)
		testData.identifier.app = args.thing.identifier.app
		testData.identifier.friendly = args.thing.identifier.friendly
		return testData
	}
})

const Query = queryField("thing", {
	type: Thing,
	resolve() {
		return testData
	}
})

const types = [
	Identifier,
	IdentifierInput,
	Thing,
	ThingInput,
	Mutation,
	Query
]

export { types as createTypes }