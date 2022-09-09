import type { JSONOutput } from "typedoc"
import type { SetOptional } from "type-fest"
import { set as setProperty } from "lodash-es"
import { getDeclarationPropReflected, isTypeDoc, parseComment } from "./helpers"
import { PrimRpcDocs, PrimMethod, PrimModule } from "./interfaces"

function handleType (given: JSONOutput.DeclarationReflection) {
	const name = given.name
	const comment = parseComment(given.comment)
	return { name, comment, kind: "primitive" } // NOTE: replace primitive later
}

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
function navigateProperties (given: JSONOutput.DeclarationReflection, docs: PrimRpcDocs, path: string[] = []) {
	addModuleToDocs(docs, {
		name: given.name,
		comment: parseComment(given.comment),
		flags: given.flags,
		path: path.join("/"),
	})
	given.children.forEach(child => {
		const hasSignature = getDeclarationPropReflected(child, "signatures")
		const hasChildren = getDeclarationPropReflected(child, "children")
		if (hasSignature.value) {
			handleFunction(hasSignature.given, path)
		} else if (hasChildren.value) {
			navigateProperties(hasChildren.reflected ?? hasChildren.given, docs, path.concat(child.name))
		}
	})
}

function addModuleToDocs(docs: SetOptional<PrimRpcDocs, "docs"|"props">, module: PrimModule) {
	const pathParts = module.path.split("/").flatMap(path => ["props", path]).filter(path => path).slice(1)
	pathParts.push("docs")
	const index = docs.modules.push(module) - 1
	const reference: PrimRpcDocs["docs"] = ["modules", index]
	return setProperty<PrimRpcDocs>(docs, pathParts, reference)
}

function addMethodsToDocs(docs: SetOptional<PrimRpcDocs, "docs"|"props">, method: PrimMethod) {
	const pathParts = method.path.split("/").flatMap(path => ["props", path]).filter(path => path).slice(1)
	pathParts.push("docs")
	const index = docs.methods.push(method) - 1
	const reference: PrimRpcDocs["docs"] = ["modules", index]
	return setProperty<PrimRpcDocs>(docs, pathParts, reference)
}

/**
 * Create documentation for a module used with Prim, as JSON. Used as input
 * for Prim Docs UI to create a documentation page. A simpler version of TypeDoc
 * intended only for documenting RPC calls.
 *
 * @param given - Output of TypeDoc documentation for module used with Prim
 * @returns Prim-specific documentation for RPC calls
 */
export function createDocsForModule(given: unknown): PrimRpcDocs {
	if (!isTypeDoc(given)) {
		throw new Error("Given documentation was not understood as TypeDoc format")
	}
	const docsStarter: SetOptional<PrimRpcDocs, "docs"|"props"> = { modules: [], methods: [] }
	const docs = addModuleToDocs(docsStarter, {
		name: given.name,
		comment: parseComment(given.comment),
		flags: given.flags,
		path: "",
	})
	navigateProperties(given, docs)
	console.log(docs)

	return {
		props: {
			test: {
				props: {
					sayHello: {
						docs: ["methods", 0],
					},
				},
				docs: ["modules", 1],
			},
		},
		docs: ["modules", 0],
		methods: [{
			name: "sayHello",
			path: "test/sayHello",
			signatures: [{
				comment: "Say hello",
				flags: {},
				params: [
					{comment: "Something", name: "greeting", type: "string" },
					{comment: "Something", name: "name", type: "string" },
				],
				returns: { comment: "Something", type: "string" },
				throws: { comment: "Idk" },
			}],
		}],
		modules: [{
			name: "module",
			path: "",
			comment: "",
			flags: {},
		}, {
			name: "test",
			path: "test",
			comment: "Maybe commented",
			flags: {},
		}],
	}
}
