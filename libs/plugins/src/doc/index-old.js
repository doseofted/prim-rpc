// import exampleDocs from "@doseofted/prim-example/dist/docs.json"
// FIXME: I'm writing logic for docs in the prim-plugins module now but this should move into its own module eventually

function parseComment (comment) {
	return comment?.summary?.map(s => s.text).reduce((p, n) => p + n, "") ?? ""
}

export function parseModule (docs) {
	const module = docs.name
	const methodIds = docs.groups.find(g => g.title === "Functions").children
	const methods = docs.children
		.filter(c => methodIds.includes(c.id))
		.map(m => {
			const method = m.name
			const overloads  = m.signatures
				.filter(sig => sig.kindString === "Call signature")
				.map(sig => {
					const comment = parseComment(sig.comment)
					const returns  = sig?.blockTags?.filter(t => t.tag === "@returns")?.content
						.reduce((p, n) => p.text + n.text, "") ?? ""
					const params = sig.parameters.map(param => {
						const name = param.name
						const comment = parseComment(param.comment)
						const type = param?.type?.type // TODO: handle reflection
						return { name, comment, type }
					})
					return { comment, returns, params }
				})
			return { method, overloads }
		})
	return { module, methods, submodules: {} }
}

// const parsedDocs = parseModule(exampleDocs)

