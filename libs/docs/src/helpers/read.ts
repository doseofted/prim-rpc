import {
	PrimRpcDocs, PrimMethod, PrimModule, PrimModuleStructure, PrimRootStructureKeys,
} from "../interfaces"

/**
 * Simple convenience function to get documentation for reference inside of Prim RPC Docs structure (`.props`)
 *
 * @param docs RPc documentation
 * @param given Property found in documentation structure
 * @returns Documentation for requested module or method
 */
export function findDocsReference(docs: Partial<PrimRpcDocs>, given?: PrimModuleStructure|PrimRpcDocs["docs"]) {
	const [type, index] = Array.isArray(given) ? given : given.docs
	// console.log(type, index)
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
	rootDocs: PrimModuleStructure, lookFor: T, submodule: Partial<PrimModuleStructure> = {}, includeNested = false,
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
