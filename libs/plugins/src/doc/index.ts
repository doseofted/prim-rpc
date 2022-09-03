import { JSONOutput, ReflectionKind } from "typedoc"
import { PrimRpcDocs } from "./interfaces"

function handleFunction (given: JSONOutput.DeclarationReflection, path: string[]) {
	const padding = " ".repeat(path.length * 2)
	const signatures = (() => {
		if (given.signatures) { return given.signatures }
		if (given.type && given.type.type === "reflection") {
			if (given.type.declaration && given.type.declaration.signatures) {
				return given.type.declaration.signatures
			}
		}
	})()
	const pathParts = path.concat(given.name)
	const pathName = pathParts.join("/")
	console.log(padding, pathName, signatures.length)
}

function navigateProperties (given: JSONOutput.DeclarationReflection, path: string[] = []) {
	// const padding = " ".repeat(count * 2)
	given.children.forEach(child => {
		if (child.signatures) {
			handleFunction(child, path)
			return
		}
		if (child.children) {
			navigateProperties(child, path.concat(child.name))
		} else if (child.type && child.type.type === "reflection" && child.type.declaration.children) {
			navigateProperties(child.type.declaration, path.concat(child.name))
		} else if (child.type && child.type.type === "reflection" && child.type.declaration.signatures) {
			handleFunction(child, path)
			// console.log(padding, "FUNCTION", child.name)
		}
	})
}

function isTypeDoc (docs: unknown): docs is JSONOutput.ProjectReflection {
	const likelyDocs = docs as JSONOutput.ProjectReflection
	return typeof likelyDocs === "object" && likelyDocs.kind === ReflectionKind.Project
}
/**
 * Create documentation for a module used with Prim, as JSON. Used as input
 * for Prim Docs UI to create a documentation page. A simpler version of TypeDoc
 * intended only for documenting RPC calls.
 *
 * @param docs Output of TypeDoc documentation for module used with Prim
 * @returns Prim-specific documentation for RPC calls
 */
export function createDocsForModule(docs: unknown): PrimRpcDocs {
	if (!isTypeDoc(docs)) {
		throw new Error("Given documentation was not understood as the TypeDoc format")
	}
	navigateProperties(docs)
	return {
		structure: {},
		methods: [],
		modules: [],
	}
}
