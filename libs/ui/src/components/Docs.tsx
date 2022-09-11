import { Component, For, JSX } from "solid-js"
import docs from "@doseofted/prim-example/dist/docs.json"
import { createDocsForModule, helpers, PrimModule } from "@doseofted/prim-docs"

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
	name?: string
}

const Docs: Component<Props> = (p) => {
	const rpcDocs = createDocsForModule(docs)
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
	const moduleName = helpers.findDocsReference(rpcDocs, rpcDocs.docs) as PrimModule
	console.log(rpcDocs)
	return (
		<div style={{ color: "white" }}>
			<p>{moduleName.name}</p>
			<For each={Object.entries(rpcDocs.props ?? {})}>{([key, _val], _index) =>
				<p>{key}</p>
			}</For>
		</div>
	)
}

export default Docs
