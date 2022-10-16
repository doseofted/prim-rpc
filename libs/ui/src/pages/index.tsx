import { Component, createSignal } from "solid-js"
import Docs from "../components/Docs"
import docs from "@doseofted/prim-example/dist/docs.json"
import { addFolderToPane, addSignalInput, addSignalMonitor } from "../utils/tweakpane"

const Index: Component = () => {
	const folder = addFolderToPane({ title: "A Folder" })
	const [num, setNum] = addSignalInput(createSignal(0), "number", { min: 0, max: 100, step: 1 }, folder)
	addSignalMonitor([num, setNum], "number", { view: "graph", min: 0, max: 100 }, folder)
	return <>
		<div onClick={() => setNum(num() + 1)}>
			This is a page. That's a number: {num()}
		</div>
		<Docs docs={docs} />
	</>
}

export default Index
