import { useStore, For } from "@builder.io/mitosis"
import { createDocsForModule, helpers } from "@doseofted/prim-docs"

type Props = {
	/** Generated Prim-RPC documentation */
	docs: unknown
}

/** Documentation example */
export default function Docs(props: Props) {
	const state = useStore({
		get docs() {
			const foundDocs = props.docs
			return foundDocs ? createDocsForModule(foundDocs) : undefined
		},
		get moduleName() {
			const foundDocs = state.docs
			return foundDocs ? helpers.findDocsReference(foundDocs, foundDocs).name : ""
		},
	})
	return (
		<div>
			<p>{state.moduleName}</p>
			<For each={Object.entries(state.docs?.props ?? {})}>{given => <p key={given[0]}>{given[0]}</p>}</For>
		</div>
	)
}
