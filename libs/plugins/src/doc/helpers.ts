import type { JSONOutput } from "typedoc"

export function findChildrenOfType(type: string, given: JSONOutput.DeclarationReflection) {
	const ids = given.groups.find(g => g.title === type).children
	return given.children.filter(c => ids.includes(c.id))
}

/** Parse given comment as markdown. Pass `tagged` to get a comment for a block tag. */
export function parseComment (comment: JSONOutput.Comment, tagged?: string): string {
	const output = tagged
		? parseComment({ summary: comment.blockTags?.find(tag => tag.name === tagged)?.content })
		: comment?.summary?.map(sum => sum.text).reduce((p, n) => p + n, "")
	return output ?? ""
}

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
