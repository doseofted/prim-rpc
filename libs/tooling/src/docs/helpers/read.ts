// Part of the Prim+RPC project ( https://prim.doseofted.com/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { get as getProperty } from "lodash-es"
import { PrimRpcDocs, PrimMethod, PrimModule, PrimModuleStructure, PrimRootStructureKeys } from "../interfaces"

/**
 * Simple convenience function to get documentation for reference inside of Prim RPC Docs structure (`.props`)
 *
 * @param docs RPc documentation
 * @param given Property found in documentation structure
 * @returns Documentation for requested module or method
 */
export function findDocsReference(
	docs: Partial<PrimRpcDocs>,
	given?: PrimModuleStructure | PrimModuleStructure["docs"]
) {
	const [type, index] = Array.isArray(given) ? given : given.docs
	return docs?.[type]?.[index]
}

// NOTE: `includeNestedMethods` may be pointless since result should be similar to `.methods`
// however, it may be useful for narrowing down methods for only a submodule (however I could just filter by `.path`)
/**
 * Given a module of Prim RPC documentation, find related modules/methods in the module
 *
 * @param rootDocs - RPC documentation (root includes methods and modules properties)
 * @param lookFor - Whether to look for "modules" or "methods"
 * @param submodule - A structure inside of RPC docs (when not provided, default to documentation root)
 * @param includeNested - By default, only direct properties will be found. Toggle this to include nested properties
 * @returns A list of modules/methods for given level of documentation
 */
export function iterateDocs<T extends PrimRootStructureKeys, U extends T extends "modules" ? PrimModule : PrimMethod>(
	rootDocs: PrimModuleStructure,
	lookFor: T,
	submodule: Partial<PrimModuleStructure> = {},
	includeNested = false
): U[] {
	const methods: U[] = []
	for (const [, details] of Object.entries(submodule.props ?? {})) {
		if (details.docs[0] === lookFor) {
			const entryDocs = findDocsReference(rootDocs, details) as U
			methods.push(entryDocs)
		}
		if (details.docs[0] === "modules" && includeNested) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const nested = iterateDocs(rootDocs, lookFor, details, true) as U[]
			methods.push(...nested)
		}
	}
	return methods
}

/**
 * Given a method's documentation, find the actual method in the documented module.
 *
 * @param docs Prim RPC docs for module
 * @param module Module that documentation references
 * @param methodDocs The method's documentation within Prim RPC docs
 * @returns The method requested in your module
 */
export function getFunctionForDocumentation<
	Given extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown
>(
	docs: PrimRpcDocs,
	module: unknown,
	methodDocs: PrimMethod | PrimModuleStructure | PrimModuleStructure["docs"]
): Given {
	if (Array.isArray(methodDocs) && methodDocs[0] === "methods") {
		const methodFound = findDocsReference(docs, methodDocs)
		if (methodFound) {
			return getProperty(module, methodFound.path) as Given
		}
	}
	if ("docs" in methodDocs) {
		return getFunctionForDocumentation(docs, module, methodDocs.docs)
	}
	if ("name" in methodDocs) {
		return getProperty(module, methodDocs.path.split("/")) as Given
	}
}
