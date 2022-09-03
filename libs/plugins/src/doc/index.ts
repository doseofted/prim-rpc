import { JSONOutput, ReflectionKind } from "typedoc"
import { PrimRpcDocs } from "./interfaces"

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
		throw new Error("Given documentation was not in TypeDoc format")
	}
	return {
		structure: {},
		methods: [],
		modules: [],
	}
}
