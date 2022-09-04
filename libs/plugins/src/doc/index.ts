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

/** Find property on given declaration regardless of whether type is reflected */
// function getDeclarationProp<
// 	K extends keyof JSONOutput.DeclarationReflection,
// 	V extends JSONOutput.DeclarationReflection,
// >(obj: V, prop: K): { obj: V, value: V[K] } {
// 	if (obj[prop]) {
// 		return { obj, value: obj[prop] }
// 	} else if (obj.type && obj.type.type === "reflection" && obj.type.declaration[prop]) {
// 		const objRef = obj.type.declaration as V
// 		return { obj: objRef, value: objRef[prop] }
// 	}
// 	return { obj, value: null }
// }

/**
 * Navigate TSDoc children and look for things with call signatures. Rather than
 * inspecting the kind, just look for a `.signature` property to treat as a method
 * and look for a `.children` property to look for a module-like object.
 *
 * @param given Some level of TSDoc declaration output
 * @param path The path given given at level (for recursion)
 */
function navigateProperties (given: JSONOutput.DeclarationReflection, path: string[] = []) {
	// console.log(path)
	given.children.forEach(child => {
		// const hasSignature = getDeclarationProp(child, "signatures")
		// const hasChildren = getDeclarationProp(child, "children")
		// if (hasSignature.value) {
		// 	handleFunction(child, path)
		// } else if (hasChildren) {
		// 	navigateProperties(hasChildren.obj, path.concat(child.name))
		// }
		if (child.signatures) {
			handleFunction(child, path)
		} else if (child.type && child.type.type === "reflection" && child.type.declaration.signatures) {
			handleFunction(child, path)
		} else if (child.children) {
			navigateProperties(child, path.concat(child.name))
		} else if (child.type && child.type.type === "reflection" && child.type.declaration.children) {
			navigateProperties(child.type.declaration, path.concat(child.name))
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
