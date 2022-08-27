// FIXME: I'm writing logic for docs in the prim-plugins module now but this should move into its own module eventually
import { JSONOutput } from "typedoc"
import { findChildrenOfType, parseComment } from "./helpers"

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
