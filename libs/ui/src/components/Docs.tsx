/** @jsxImportSource solid-js */
import { Component, createEffect, createMemo, For, JSX, splitProps } from "solid-js"
import { createDocsForModule, helpers } from "@doseofted/prim-docs"

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
	docs?: unknown
}

const Docs: Component<Props> = (p) => {
	const [props, attrs] = splitProps(p, ["docs"])
	const docs = createMemo(() => props.docs ? createDocsForModule(props.docs) : undefined)
	const moduleName = createMemo(() => {
		const givenDoc = docs()
		if (!givenDoc) { return null }
		helpers.findDocsReference(givenDoc, givenDoc).name
	})
	createEffect(() => {
		console.log("docs:", docs())
	})
	return (
		<div {...attrs}>
			<p>{moduleName()}</p>
			<For each={Object.entries(docs()?.props ?? {})}>{([key, _val]) =>
				<p>{key}</p>
			}</For>
		</div>
	)
}

export default Docs
