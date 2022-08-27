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
