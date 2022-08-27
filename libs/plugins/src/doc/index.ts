// FIXME: I'm writing logic for docs in the prim-plugins module now but this should move into its own module eventually
import { JSONOutput, ReflectionKind } from "typedoc"
import { findChildrenOfType, parseComment } from "./helpers"
import { PrimRpcDocs, PrimRpcModuleShape, PrimRpcModuleShapeGiven, RpcMethodDocsById, RpcTypeDocsById } from "./interfaces"

export function parseModule (docs: JSONOutput.ProjectReflection) {
	const { name: module } = docs
	const methodList = findChildrenOfType("Functions", docs)
		.map(methodGiven => {
			const { name: method, signatures } = methodGiven
			const overloads  = signatures
				.filter(sig => sig.kindString === "Call signature")
				.map(signature => {
					const comment = parseComment(signature.comment)
					const returns = parseComment(signature.comment, "@returns")
					const params = signature.parameters.map(param => {
						const name = param.name
						const comment = parseComment(param.comment)
						const type = param?.type.type // TODO: handle reflection
						return { name, comment, type }
					})
					return { comment, returns, params }
				})
			return { method, overloads }
		})
	const methods: { [method: string]: typeof methodList["0"]["overloads"]} = {}
	for (const method of methodList) {
		methods[method.method] = method.overloads
	}
	return { module, methods, submodules: {} }
}

let fakeId = 0
/** To be replaced with real generator later */
function idGenerator() { return String(++fakeId) }

export function createDocsForModule(docs: JSONOutput.ProjectReflection): PrimRpcDocs {
	const moduleName = docs.name
	const shape: PrimRpcModuleShape = {}
	const method: RpcMethodDocsById = {}
	const type: RpcTypeDocsById = {}
	docs.children.forEach(child => {
		const shapeId = child.name
		const shapePartial: Partial<PrimRpcModuleShapeGiven> = { id: idGenerator() }
		switch (child.kind) {
			case ReflectionKind.Function:
			case ReflectionKind.Method: {
				shapePartial.type = "method"
				break
			}
			case ReflectionKind.Variable:
			case ReflectionKind.Namespace: {
				shapePartial.type = "shape"
				// recursion here ...
				break
			}
			default: {
				break
			}
		}
		const newShape: PrimRpcModuleShapeGiven = {
			id: shapePartial.id,
			type: shapePartial.type ?? "unknown",
		}
		shape[shapeId] = newShape
	})
	return {
		moduleName,
		shape,
		method,
		type,
	}
}