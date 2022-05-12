// import jsdoc from "./examples/main.jsdoc.json"
import tsdoc from "./examples/main.typedoc.json"

export function generateTsDocs () {
	const t = tsdoc
	return {
		package: t.name,
		modules: t.children
			.map(({ name, kindString, type: typeParent }) => {
				const { type, declaration } = typeParent ?? {}
				return { name, kindString, type, declaration }
			})
			.filter(t => {
				const literal = t.kindString === "Variable" && t.type === "literal"
				return !literal
			})
			.sort()
	}
}
