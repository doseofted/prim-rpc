import { arg, inputObjectType, mutationField, objectType, queryField } from "nexus"
import { InputDefinitionBlock, ObjectDefinitionBlock } from "nexus/dist/blocks"
import { CommonFieldConfig } from "nexus/dist/core"

interface CustomScalarType {
	fieldName: string,
	type: "string"|"boolean"|"float"|"int"|"id",
	config: CommonFieldConfig
}

function createScalarFieldTypes<T extends string>(
	given: CustomScalarType[],
	t: InputDefinitionBlock<T> | ObjectDefinitionBlock<T>
) {
	for (const {type, config, fieldName} of given) {
		t[type](fieldName, config)
	}
}

function createIdentifierTypes () {
	const name = "Idenfitier"
	const description = "Identifiers used in different contexts, such as internally or in a sentence."
	const types = [
		{
			fieldName: "app",
			type: "string",
			config: { description: "Identifier as used by an app, not reader-friendly" }
		},
		{
			fieldName: "friendly",
			type: "string",
			config: { description: "Name as used in conversation, reader-friendly" }
		}
	] as CustomScalarType[]
	const Identifier = objectType({
		name,
		description,
		definition(t) {
			createScalarFieldTypes(types, t)
		}
	})
	const IdentifierInput = inputObjectType({
		name: `${name}Input`,
		description,
		definition(t) {
			createScalarFieldTypes(types, t)
		}
	})
	return { Identifier, IdentifierInput }
}

const { Identifier, IdentifierInput } = createIdentifierTypes()

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