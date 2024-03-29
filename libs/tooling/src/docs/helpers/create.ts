// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { JSONOutput } from "typedoc"

// export function findChildrenOfType(type: string, given: JSONOutput.DeclarationReflection) {
// 	const ids = given.groups.find(g => g.title === type).children
// 	return given.children.filter(c => ids.includes(c.id))
// }

/** Determine if given structure is a TypeDoc */
export function isTypeDoc(docs: unknown): docs is JSONOutput.DeclarationReflection {
	const likelyDocs = docs as JSONOutput.DeclarationReflection
	// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
	return typeof likelyDocs === "object" && likelyDocs.kind === 1 // ReflectionKind.Project === 1
}

/** Find property on given declaration regardless of whether type is reflected */
export function getDeclarationPropReflected<
	Given extends JSONOutput.DeclarationReflection,
	Key extends keyof JSONOutput.DeclarationReflection,
>(given: Given, prop: Key): { given: Given; reflected: Given; value: Given[Key] } {
	if (prop in given) {
		return { given, reflected: null, value: given[prop] }
	} else if (given.type && given.type.type === "reflection" && prop in given.type.declaration) {
		const reflected = given.type.declaration as Given
		return { given, reflected, value: reflected[prop] }
	}
	return { given, reflected: null, value: null }
}

/** Parse given comment as Markdown. Pass `tagged` to get a comment for a block tag. */
export function parseComment(comment: JSONOutput.Comment, tagged?: string): string {
	const output = tagged
		? parseComment({ summary: comment?.blockTags?.find(tag => tag.name === tagged)?.content })
		: comment?.summary?.map(sum => sum.text).reduce((p, n) => p + n, "")
	return output ?? ""
}
