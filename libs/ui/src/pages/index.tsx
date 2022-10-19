import { Component, createSignal, For } from "solid-js"
import Docs from "../components/Docs"
import docs from "@doseofted/prim-example/dist/docs.json"
import { addFolderToPane, addSignalInput, addSignalMonitor } from "../utils/tweakpane"
import { Light, Lights } from "../components/Lights"

const Index: Component = () => {
	const folder = addFolderToPane({ title: "A Folder" })
	// eslint-disable-next-line solid/reactivity
	const numSignal = addSignalInput(createSignal(0), "number", { min: 0, max: 100, step: 1 }, folder)
	const [num, setNum] = numSignal
	addSignalMonitor(numSignal, "number", { view: "graph", min: 0, max: 100 }, folder)
	const TestOnly = () => {
		const size = () => `${num()}px`
		return (<Light style={{ width: size(), height: size() }} class="bg-gray border-white m-6 border-2">
			&hellip;
		</Light>)
	}
	return (
		<Lights>
			{/* <Lights style={{ position: "absolute", width: "100%", height: "100vh", top: 0, left: 0 }} /> */}
			<div onClick={() => setNum(num() + 1)} class="relative">
				This is a page. That's a number: {num()}
			</div>
			<div class="lights-and-stuff flex relative flex-wrap">
				<For each={new Array(50)}>{() => <TestOnly />}</For>
			</div>
			<Docs docs={docs} />
		</Lights>
	)
}

export default Index
