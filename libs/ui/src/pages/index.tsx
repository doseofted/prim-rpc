import { Component, createSignal } from "solid-js"
import Docs from "../components/Docs"
import docs from "@doseofted/prim-example/dist/docs.json"
import { addFolderToPane, addSignalInput, addSignalMonitor } from "../utils/tweakpane"
import Lights, { LightsContext } from "../components/Lights"

const Index: Component = () => {
	const folder = addFolderToPane({ title: "A Folder" })
	// eslint-disable-next-line solid/reactivity
	const numSignal = addSignalInput(createSignal(0), "number", { min: 0, max: 100, step: 1 }, folder)
	const [num, setNum] = numSignal
	addSignalMonitor(numSignal, "number", { view: "graph", min: 0, max: 100 }, folder)
	return (
		<LightsContext.Provider value={numSignal}>
			<Lights style={{ position: "absolute", width: "100%", height: "100vh", top: 0, left: 0 }} />
			<div onClick={() => setNum(num() + 1)}>
				This is a page. That's a number: {num()}
			</div>
			<Docs docs={docs} />
		</LightsContext.Provider>
	)
}

export default Index
