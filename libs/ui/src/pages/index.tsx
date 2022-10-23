import { Component, createSignal, For } from "solid-js"
import Docs from "../components/Docs"
import docs from "@doseofted/prim-example/dist/docs.json"
import { addFolderToPane, addSignalInput } from "../utils/tweakpane"
import { Light, Lights } from "../components/Lights"

const Index: Component = () => {
	const folder = addFolderToPane({ title: "A Folder" })
	// eslint-disable-next-line solid/reactivity -- just a wrapper around signal
	const [count] = addSignalInput(createSignal(100), "count", { min: 0, max: 100, step: 1 }, folder)
	// eslint-disable-next-line solid/reactivity -- just a wrapper around signal
	const [brightness] = addSignalInput(createSignal(1), "brightness", { min: 0, max: 2, step: 0.01 }, folder)
	// eslint-disable-next-line solid/reactivity -- just a wrapper around signal
	const [size] = addSignalInput(createSignal(500), "size", { min: 0, max: 500, step: 1 }, folder)
	// addSignalMonitor(numSignal, "number", { view: "graph", min: 0, max: 100 }, folder)
	const TestOnly = () => {
		const sizeStyle = () => `${count()}px`
		return (<Light style={{ width: sizeStyle(), height: sizeStyle() }} options={{ size: size(), brightness: brightness() }} class="bg-black border-white m-6 border-2 rounded-full text-white flex justify-center items-center">
			<span class="relative -top-1">&hellip;</span>
		</Light>)
	}
	return (
		<Lights>
			<div class="relative grid w-full grid-cols-2 justify-center place-content-center gap-4 mx-auto p-8 max-w-2xl">
				<Light options={{ color: "#f00", size: size(), brightness: brightness() }} class="border border-white/50 bg-white/40 backdrop-blur-lg rounded-lg p-8 text-center h-75vh">This is a test.</Light>
				<Light options={{ color: "#0f0", size: size(), brightness: brightness() }} class="border border-white/50 bg-white/40 backdrop-blur-lg rounded-lg p-8 text-center h-50vh">Another test!</Light>
			</div>
			<div class="lights-and-stuff flex relative flex-wrap justify-center">
				<For each={new Array(count())}>{() => <TestOnly />}</For>
			</div>
			<Docs class="relative" docs={docs} />
		</Lights>
	)
}

export default Index
