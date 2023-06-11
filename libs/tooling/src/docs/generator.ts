// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { JSONOutput } from "typedoc"
import type { SetOptional } from "type-fest"
import setProperty from "just-safe-set"
import { getDeclarationPropReflected, isTypeDoc, parseComment } from "./helpers/create"
import {
	PrimRpcDocs,
	PrimMethod,
	PrimModule,
	PrimMethodSignature,
	PrimParam,
	PrimType,
	PrimReturn,
	PrimThrow,
	BasicTypes,
	CommonTypes,
} from "./interfaces"

function handleType(given: JSONOutput.SomeType): PrimType["type"] {
	if (given.type === "array") {
		return "Array"
	}
	if (given.type === "intrinsic") {
		/** Types that appear to be used with "intrinsic" in TypeDoc */
		const available: Record<string, BasicTypes | CommonTypes> = {
			string: "string",
			number: "number",
			boolean: "boolean",
			null: "null",
			bigint: "bigint",
			void: "undefined",
			symbol: "symbol", // TODO: make sure TypeDoc considers "symbol" intrinsic (probably)
		}
		return available[given.name] ?? "unknown"
	}
	if (given.type === "reference") {
		return "Object"
	}
	if (given.type === "reflection" && given.declaration.signatures && given.declaration.signatures.length > 0) {
		return "Function"
	}
	return "unknown"
	// TODO: add ".typed" details
}

/**
 * Inspect the parts of given object for function-like things
 *
 * @param given Given function-like object that has a call signature
 * @param docs RPC documentation in-progress
 * @param path Path of current method
 */
function handleMethodLike(given: JSONOutput.DeclarationReflection, docs: PrimRpcDocs, path: string[]) {
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
 * Add a module to documentation. This is functionally very similar to `addMethodToDocs()`
 *
 * @param docs RPC documentation in-progress
 * @param module Given module in expected format
 * @returns a copy of given documentation, with changes
 */
function addModuleToDocs(docs: SetOptional<PrimRpcDocs, "docs" | "props">, module: PrimModule) {
	// return addThingToDocs(docs, "modules", module)
	const pathParts = module.path
		.split("/")
		.filter(path => path)
		.flatMap(path => ["props", path])
	pathParts.push("docs")
	const index = docs.modules.push(module) - 1
	const reference: PrimRpcDocs["docs"] = ["modules", index]
	setProperty(docs, pathParts, reference)
	return docs as PrimRpcDocs
}

/**
 * Add a method to documentation
 *
 * @param docs RPC documentation in-progress
 * @param method Given method in expected format
 * @returns a copy of given documentation, with changes
 */
function addMethodToDocs(docs: SetOptional<PrimRpcDocs, "docs" | "props">, method: PrimMethod) {
	// return addThingToDocs(docs, "methods", method)
	const pathParts = method.path
		.split("/")
		.filter(path => path)
		.flatMap(path => ["props", path])
	pathParts.push("docs")
	const index = docs.methods.push(method) - 1
	const reference: PrimRpcDocs["docs"] = ["methods", index]
	setProperty(docs, pathParts, reference)
	return docs as PrimRpcDocs
}

/**
 * Given some type that references another type in the TypeDoc documentation,
 * navigate the TypeDoc structure for the actual referenced type.
 */
function queryGivenReference(
	given: JSONOutput.DeclarationReflection,
	id: number
): JSONOutput.DeclarationReflection | void {
	const givenChildren = getDeclarationPropReflected(given, "children")
	const children = givenChildren.reflected?.children ?? givenChildren.given?.children ?? []
	for (const child of children) {
		if (child.id === id) {
			return child
		}
		const found = queryGivenReference(child, id)
		if (found) {
			return found
		}
	}
	return
}

/**
 * Navigate TSDoc children and look for things with call signatures. Rather than
 * inspecting the kind, just look for a `.signature` property to treat as a method
 * and look for a `.children` property to look for a module-like object.
 *
 * @param root - Given TypeDoc information, in full
 * @param given - Given TypeDoc information for given level (used in recursion)
 * @param docs - In-progress RPC documentation
 * @param path - Path of current module
 * @returns whether the given object contains functions
 */
function navigateModuleLike(
	root: JSONOutput.DeclarationReflection,
	given: JSONOutput.DeclarationReflection,
	docs: PrimRpcDocs,
	path: string[] = []
) {
	let containsFunctions = false
	const givenChildren = getDeclarationPropReflected(given, "children")
	const children = givenChildren.reflected?.children ?? givenChildren.given?.children ?? []
	children.forEach(child => {
		// NOTE: if function has properties (like `.rpc`), it will probably have a signature **and** children
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const referencedIdentifier = (child.type && child.type.type === "query" && child.type.queryType.target) || false
		// if given type is "query" then use the given ID to find the referenced type
		const childActual =
			(typeof referencedIdentifier === "number" ? queryGivenReference(root, referencedIdentifier) : child) || child
		const hasSignature = getDeclarationPropReflected(childActual, "signatures")
		const hasChildren = getDeclarationPropReflected(childActual, "children")
		if (hasSignature.value) {
			handleMethodLike(hasSignature.given, docs, path)
			containsFunctions = true
		} else if (hasChildren.value) {
			containsFunctions = navigateModuleLike(root, hasChildren.given, docs, path.concat(child.name))
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
	navigateModuleLike(given, given, docs)
	// console.log(JSON.stringify(docs, null, "  "))
	return docs
}
// TODO: support both `.rpc` on functions and schema limit provided to Prim Server to limit documentation
