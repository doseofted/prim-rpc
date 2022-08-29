// FIXME: I'm writing logic for docs in the prim-plugins module now but this should move into its own module eventually
import { JSONOutput, ReflectionKind } from "typedoc"
import { parseComment } from "./helpers"
import {
	PrimDocRootRef, PrimRpcDocs, PrimRpcModuleShape, PrimRpcModuleShapeGiven, RpcMethodDocs, RpcMethodDocsById, RpcParam,
	RpcReturns, RpcThrows, RpcTypeDocsById,
} from "./interfaces"

let fakeId = 0
/** To be replaced with real generator later */
function idGenerator() { return "id-" + String(++fakeId) }

interface GetParametersReturn { params: RpcParam[], type: RpcTypeDocsById }
function getParameters (given: JSONOutput.ParameterReflection[]): GetParametersReturn {
	const type: RpcTypeDocsById = {}
	const params = given.map(param => {
		const name = param.name
		const comment = parseComment(param.comment)
		const ref: PrimDocRootRef = "type"
		const id = idGenerator()
		// TODO: get type from `param.type` and use `id` above to assign to `type[id]`
		return { name, comment, ref, id }
	})
	return { params, type }
}

function getCallSignatures(func: JSONOutput.DeclarationReflection): RpcMethodDocs[] {
	const { signatures } = func
	const methods: RpcMethodDocs[] = signatures.map(signature => {
		const name = signature.name
		const comment = parseComment(signature.comment)
		const { params /* type: paramType */ } = getParameters(signature.parameters)
		const returnsComment = parseComment(signature.comment, "@returns")
		// TODO: get returns type and assign to local `type` variable that will later be assigned to root `.type` of docs
		const returns: RpcReturns = { comment: returnsComment, id: idGenerator(), ref: "type" }
		const throwsComment = parseComment(signature.comment, "@throws")
		const throws: RpcThrows = { comment: throwsComment }
		return { name, comment, params, returns, throws }
	})
	return methods
}

type TypePrimInterpret = "function"|"module"|"variable"|"reflection"
/** Based on given TypeDoc documentation, determine type relevant to Prim RPC Docs */
function determinePrimType (given: JSONOutput.DeclarationReflection): TypePrimInterpret {
	if (!given.type) {
		if (given.signatures) {
			console.log("is function", given.name)
			return "function"
		} else if (given.children) {
			// TODO: determine if object has callable properties
			const givenFunctions = given.children
				.map(c => determinePrimType(c)).filter(c => c === "function")
			console.log(given.name, givenFunctions)
			return givenFunctions.length > 0 ? "module" : "variable"
		}
	}
	const { type } = given.type
	if (type === "literal") { // string, number, etc.
		return "variable"
	} else if (type === "reflection") { // need to narrow down
		const { declaration } = given.type
		console.log("please", given.name, declaration)
		return determinePrimType(declaration)
	}
}

interface ReturnedChild {
	shape: PrimRpcModuleShape
	method: RpcMethodDocsById
	type:  RpcTypeDocsById
}
function navigateChildren (docs: JSONOutput.DeclarationReflection): ReturnedChild {
	const { children } = docs
	const shape: PrimRpcModuleShape = {}
	const method: RpcMethodDocsById = {}
	const type:  RpcTypeDocsById = {}
	children.forEach(child => {
		const shapeIdentifier = child.name
		switch (child.kind) {
			// case ReflectionKind.Method:
			case ReflectionKind.Function: {
				const methodShape: PrimRpcModuleShapeGiven = {
					ref: "method",
					id: idGenerator(),
				}
				const callSignatures = getCallSignatures(child)
				method[methodShape.id] = callSignatures
				shape[shapeIdentifier] = methodShape
				break
			}
			case ReflectionKind.Variable: // Variable types could potentially contain functions so determine if module-like
			case ReflectionKind.Namespace: {
				const givenType = determinePrimType(child)
				const moduleLike = givenType === "module"
				console.log(givenType, child.type.type, child.name)
				if (moduleLike && child.type.type === "reflection") {
					const childDetails = navigateChildren(child.type.declaration)
					const moduleShape: PrimRpcModuleShapeGiven = {
						ref: "shape", // NOTE: consider making ref optional since modules ("shape") don't have a useful ref
						id: idGenerator(),
						shape: childDetails.shape,
					}
					shape[shapeIdentifier] = moduleShape
					// only root object has methods and types, so add to this level
					for (const [identifier, givenMethod] of Object.entries(childDetails.method)) {
						method[identifier] = givenMethod
					}
					for (const [identifier, givenType] of Object.entries(childDetails.type)) {
						type[identifier] = givenType
					}
				} else {
					// NOTE: variables probably don't need to be included in shape because
					// it doesn't really matter in terms of structuring RPC call documentation
					const typeShape: PrimRpcModuleShapeGiven = {
						ref: "type",
						id: idGenerator(),
						// NOTE: shape is not added here but is added to `.type` instead
					}
					type[typeShape.id] = {
						intrinsic: "type",
						type: child.name, // debugging only
					}
				}
				break
			}
			default: { break }
		}
	})
	return { shape, method, type }
}

/**
 * Create documentation for a module used with Prim, as JSON. Used as input
 * for Prim Docs UI to create a documentation page.
 *
 * @param docs Output of TypeDoc documentation for module used with Prim
 * @returns Prim-specific documentation for RPC calls
 */
export function createDocsForModule(docs: unknown): PrimRpcDocs {
	const likelyDocs = docs as JSONOutput.ProjectReflection
	const moduleName = likelyDocs.name
	const { method, shape, type } = navigateChildren(likelyDocs)
	return {
		moduleName,
		shape,
		method,
		type,
	}
}
