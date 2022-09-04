import { JSONOutput } from "typedoc"
import { getDeclarationPropReflected, isTypeDoc, parseComment } from "./helpers"
import { PrimRpcDocs, TsType } from "./interfaces"

function handleType (given: JSONOutput.DeclarationReflection): TsType {
	const name = given.name
	const comment = parseComment(given.comment)
	const givenType = given.type && given.type.type
	const kind = (() => {
		switch (givenType) {
			case "intrinsic":
			case "reference": {
				return "object" as const
			}
		}
	})()
	switch (kind) {
		// case "primitive":
		case "object": {
			return {
				kind,
				name,
				comment,
			}
		}
		default: {
			return {
				kind: "primitive",
				name,
				comment,
			}
		}
	}
}

function handleFunction (given: JSONOutput.DeclarationReflection, path: string[]) {
	const padding = " ".repeat(path.length * 2)
	const pathParts = path.concat(given.name)
	const pathName = pathParts.join("/")
	const signatures = getDeclarationPropReflected(given, "signatures").value
	signatures.forEach(signature => {
		const name = given.name
		const comment = parseComment(signature.comment)
		const params = signature.parameters.map(param => handleType(param))
		const test = { name, comment }
		console.log(padding, pathName, test, params)
	})
}

/**
 * Navigate TSDoc children and look for things with call signatures. Rather than
 * inspecting the kind, just look for a `.signature` property to treat as a method
 * and look for a `.children` property to look for a module-like object.
 *
 * @param given - Some level of TSDoc declaration output
 * @param path - The path given given at level (for recursion)
 */
function navigateProperties (given: JSONOutput.DeclarationReflection, path: string[] = []) {
	given.children.forEach(child => {
		const hasSignature = getDeclarationPropReflected(child, "signatures")
		const hasChildren = getDeclarationPropReflected(child, "children")
		if (hasSignature.value) {
			handleFunction(hasSignature.given, path)
		} else if (hasChildren.value) {
			navigateProperties(hasChildren.reflected ?? hasChildren.given, path.concat(child.name))
		}
	})
}

/**
 * Create documentation for a module used with Prim, as JSON. Used as input
 * for Prim Docs UI to create a documentation page. A simpler version of TypeDoc
 * intended only for documenting RPC calls.
 *
 * @param docs - Output of TypeDoc documentation for module used with Prim
 * @returns Prim-specific documentation for RPC calls
 */
export function createDocsForModule(docs: unknown): PrimRpcDocs {
	if (!isTypeDoc(docs)) {
		throw new Error("Given documentation was not understood as the TypeDoc format")
	}
	navigateProperties(docs)
	return {
		// TODO: reconsider structure so that modules can have comments
		structure: {},
		methods: [],
		modules: [],
	}
}
