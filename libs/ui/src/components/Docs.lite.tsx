import { useStore, For } from "@builder.io/mitosis"
import { createDocsForModule, helpers } from "@doseofted/prim-docs"

type Props = {
	/** Generated Prim-RPC documentation */
	docs: unknown
}

export default function Docs(props: Props) {
	const state = useStore({
		get docs() {
			return props.docs ? createDocsForModule(props.docs) : undefined
		},
		get moduleName() {
			return state.docs ? helpers.findDocsReference(state.docs, state.docs).name : ""
		},
	})
	return (
		<div>
			<p>{state.moduleName}</p>
			<For each={Object.entries(state.docs?.props ?? {})}>{(given) =>
				<p key={given[0]}>{given[0]}</p>
			}</For>
		</div>
	)
}
