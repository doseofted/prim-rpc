import { Component, createSignal, For } from "solid-js"
import Docs from "../components/Docs"
import docs from "@doseofted/prim-example/dist/docs.json"
import { addFolderToPane, addSignalInput } from "../utils/tweakpane"
import { Light, Lights } from "../components/Lights"

const Index: Component = () => {
	const folder = addFolderToPane({ title: "A Folder" })
	// eslint-disable-next-line solid/reactivity
	const numSignal = addSignalInput(createSignal(0), "number", { min: 0, max: 100, step: 1 }, folder)
	const [num, setNum] = numSignal
	// addSignalMonitor(numSignal, "number", { view: "graph", min: 0, max: 100 }, folder)
	const TestOnly = () => {
		const size = () => `${num()}px`
		return (<Light style={{ width: size(), height: size() }} class="bg-gray border-white m-6 border-2">
			&hellip;
		</Light>)
	}
	return (
		<Lights>
			<div class="relative grid w-full grid-cols-2 justify-center place-content-center gap-4 mx-auto p-8 max-w-2xl">
				<Light class="border border-white/50 bg-white/40 backdrop-blur-lg rounded-lg p-8 text-center">This is a test.</Light>
				<Light class="border border-white/50 bg-white/40 backdrop-blur-lg rounded-lg p-8 text-center">Another test!</Light>
			</div>
			<div class="lights-and-stuff flex relative flex-wrap">
				<For each={new Array(num())}>{() => <TestOnly />}</For>
			</div>
			<Docs class="relative" docs={docs} />
		</Lights>
	)
}

export default Index
