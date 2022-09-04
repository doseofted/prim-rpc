import { JSONOutput } from "typedoc"
import { getDeclarationPropReflected, isTypeDoc /* parseComment */ } from "./helpers"
import { PrimRpcDocs /* PrimRpcSignature, TsType, TypeKindRestricted */ } from "./interfaces"

/**
 * TODO: Find a way to process detailed information about types. To properly
 * document TypeScript types is a huge task so for now I need to reduce types
 * down to something simple that can be understood by from a documentation UI.
 * 
 * This is a huge task since it means supporting each individual TypeScript type
 * like unions, enums, interfaces, types, optional types and handling of those
 * types inside of other types, and reference reflections,
 * and documenting these types in a way that can be easily consumed. TypeScript
 * is obviously the easiest way to define these types but navigating an AST is
 * not an option for someone utilizing this library. Even navigating TypeDoc's
 * processed type information is complicated even though it's much simpler than
 * parsing the tree itself.
 * 
 * Ideally, I could convert this to some standard schema like JSON Schema so that
 * a documentation UI can easily validate types (since documentation should be
 * interactive and let you actually make requests).
 * 
 * @param given a type to be understood
 */
// function handleType (given: JSONOutput.DeclarationReflection): TsType {
// 	const name = given.name
// 	const comment = parseComment(given.comment)
// 	return { name, comment, kind: "primitive" } // NOTE: replace primitive later
// }

function handleFunction (given: JSONOutput.DeclarationReflection, path: string[]) {
	const padding = " ".repeat(path.length * 2)
	const pathParts = path.concat(given.name)
	const pathName = pathParts.join("/")
	// const signatures = getDeclarationPropReflected(given, "signatures").value
	console.log(padding, pathName)
	// signatures.forEach(signature => {
	// 	const name = given.name
	// 	const comment = parseComment(signature.comment)
	// 	const params = signature.parameters.map(param => {
	// 		const name = param.name
	// 		const comment = parseComment(param.comment)
	// 		const type = handleType(param)
	// 		return { name, comment, type }
	// 	})
	// 	const sig: PrimRpcSignature = { name, comment, params }
	// 	console.log(padding, pathName + "(" + params.map(p => p.name).join(", ") + ")", sig)
	// 	return sig
	// })
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
