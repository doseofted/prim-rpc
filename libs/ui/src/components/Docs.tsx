import { Component, createEffect, createMemo, For, JSX } from "solid-js"
import { createDocsForModule, helpers } from "@doseofted/prim-docs"

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
	docs?: unknown
}

const Docs: Component<Props> = (props) => {
	const docs = createMemo(() => createDocsForModule(props.docs))
	const moduleName = createMemo(() => helpers.findDocsReference(docs(), docs()).name)
	createEffect(() => {
		console.log("docs:", docs())
	})
	return (
		<div>
			<p>{moduleName()}</p>
			<For each={Object.entries(docs().props ?? {})}>{([key, _val]) =>
				<p>{key}</p>
			}</For>
		</div>
	)
}

export default Docs
