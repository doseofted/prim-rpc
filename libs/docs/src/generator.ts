import { JSONOutput } from "typedoc"
import type { SetOptional } from "type-fest"
import { /* get as getProperty, */ set as setProperty } from "lodash-es"
import { getDeclarationPropReflected, isTypeDoc, parseComment } from "./helpers/create"
import {
	PrimRpcDocs, PrimMethod, PrimModule, PrimMethodSignature, PrimParam, PrimType, PrimReturn, PrimThrow,
} from "./interfaces"

function handleType (_given: JSONOutput.SomeType): PrimType["type"] {
	// const name = given.name
	// const comment = parseComment(given.comment)
	return "undefined" // TODO: add types
}

/**
 * Inspect the parts of given object for function-like things
 *
 * @param given Given function-like object that has a call signature
 * @param docs RPC documentation in-progress
 * @param path Path of current method
 */
function handleMethodLike (given: JSONOutput.DeclarationReflection, docs: PrimRpcDocs, path: string[]) {
	const pathParts = path.concat(given.name)
	const signatures: PrimMethodSignature[] = getDeclarationPropReflected(given, "signatures").value.map(signature => {
		const comment = parseComment(signature.comment)
		const flags = signature.flags
		const params: PrimParam[] = signature.parameters.map(param => {
			const name = param.name
			const flags = param.flags
			const comment = parseComment(param.comment)
			const type = handleType(param.type)
			return { name, comment, flags, type }
		})
		const returns: PrimReturn = {
			comment: parseComment(signature.comment, "@returns"),
			type: handleType(signature.type),
		}
		const throws: PrimThrow = {
			comment: parseComment(signature.comment, "@throws"),
		}
		return { comment, flags, params, returns, throws }
	})
	// const padding = " ".repeat(path.length * 2)
	// console.log(padding, pathParts.join("/"))
	addMethodToDocs(docs, {
		name: given.name,
		path: pathParts.join("/"),
		signatures,
	})
}

/**
 * Add a module to documentation
 *
 * @param docs RPC documentation in-progress
 * @param module Given module in expected format
 * @returns a copy of given documentation, with changes
 */
function addModuleToDocs(docs: SetOptional<PrimRpcDocs, "docs"|"props">, module: PrimModule) {
	const pathParts = module.path.split("/").filter(path => path).flatMap(path => ["props", path])
	pathParts.push("docs")
	const index = docs.modules.push(module) - 1
	const reference: PrimRpcDocs["docs"] = ["modules", index]
	return setProperty<PrimRpcDocs>(docs, pathParts, reference)
}

/**
 * Add a method to documentation
 *
 * @param docs RPC documentation in-progress
 * @param method Given method in expected format
 * @returns a copy of given documentation, with changes
 */
function addMethodToDocs(docs: SetOptional<PrimRpcDocs, "docs"|"props">, method: PrimMethod) {
	const pathParts = method.path.split("/").filter(path => path).flatMap(path => ["props", path])
	pathParts.push("docs")
	const index = docs.methods.push(method) - 1
	const reference: PrimRpcDocs["docs"] = ["methods", index]
	return setProperty<PrimRpcDocs>(docs, pathParts, reference)
}

/**
 * Navigate TSDoc children and look for things with call signatures. Rather than
 * inspecting the kind, just look for a `.signature` property to treat as a method
 * and look for a `.children` property to look for a module-like object.
 * 
 * @param given - Given TypeDoc information
 * @param docs - In-progress RPC documentation
 * @param path - Path of current module
 * @returns whether the given object contains functions
 */
function navigateModuleLike (given: JSONOutput.DeclarationReflection, docs: PrimRpcDocs, path: string[] = []) {
	let containsFunctions = false
	const givenChildren = getDeclarationPropReflected(given, "children")
	const children = givenChildren.reflected?.children ?? givenChildren.given?.children ?? []
	children.forEach(child => {
		// NOTE: if function has properties (like `.rpc`), it will probably have a signature **and** children
		const hasSignature = getDeclarationPropReflected(child, "signatures")
		const hasChildren = getDeclarationPropReflected(child, "children")
		if (hasSignature.value) {
			handleMethodLike(hasSignature.given, docs, path)
			containsFunctions = true
		} else if (hasChildren.value) {
			containsFunctions = navigateModuleLike(hasChildren.given, docs, path.concat(child.name))
		}
	})
	if (containsFunctions) {
		addModuleToDocs(docs, {
			name: given.name,
			comment: parseComment(given.comment),
			flags: given.flags,
			path: path.join("/"),
		})
	}
	return containsFunctions
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
	// NOTE: `.docs` property will be overridden later
	const docs: PrimRpcDocs = { modules: [], methods: [], props: {}, docs: ["modules", 0] }
	navigateModuleLike(given, docs)
	// console.log(JSON.stringify(docs, null, "  "))
	return docs
}
// TODO: support both `.rpc` on functions and schema limit provided to Prim Server to limit documentation
