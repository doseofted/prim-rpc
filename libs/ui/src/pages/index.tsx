import { Component, createMemo, createSignal, For } from "solid-js"
import Docs from "../components/Docs"
import docs from "@doseofted/prim-example/dist/docs.json"
import { addFolderToPane, addSignalInput, fps } from "../utils/tweakpane"
import { Light, Lights } from "../components/Lights"
import { LightAuto } from "../components/LightsExtended"

const Index: Component = () => {
	const folder = addFolderToPane({ title: "A Folder" })
	// eslint-disable-next-line solid/reactivity -- just a wrapper around signal
	const [count] = addSignalInput(createSignal(20), "count", { min: 0, max: 100, step: 1 }, folder)
	// eslint-disable-next-line solid/reactivity -- just a wrapper around signal
	const [brightness] = addSignalInput(createSignal(1), "brightness", { min: 0, max: 2, step: 0.01 }, folder)
	// eslint-disable-next-line solid/reactivity -- just a wrapper around signal
	const [size] = addSignalInput(createSignal(500), "size", { min: 0, max: 500, step: 1 }, folder)
	const offsetLimits = { min: -250, max: 250 }
	// eslint-disable-next-line solid/reactivity -- just a wrapper around signal
	const [offsetX] = addSignalInput(createSignal(0), "offsetX", offsetLimits, folder)
	// eslint-disable-next-line solid/reactivity -- just a wrapper around signal
	const [offsetY] = addSignalInput(createSignal(0), "offsetY", offsetLimits, folder)
	// eslint-disable-next-line solid/reactivity -- just a wrapper around signal
	const [rotate] = addSignalInput(createSignal(0), "rotate", { min: 0, max: 360 }, folder)
	const offsetFormat = createMemo((): [number, number] => [offsetX(), offsetY()])
	const lights = createMemo(() => new Array(count()))
	// addSignalMonitor(numSignal, "number", { view: "graph", min: 0, max: 100 }, folder)
	const sizeStyle = () => `${count()}px`
	return (
		<Lights
			options={{ size: size(), brightness: brightness(), offset: offsetFormat(), rotate: rotate() }}
			// colors={["#ff0", "#0ff", "#f0f", "#f00", "#0f0", "#00f"]}
			fps={fps}
		// background="transparent"
		>
			<div class="lights-and-stuff flex relative flex-wrap justify-center">
				<For each={lights()}>{() => (
					<Light
						style={{ width: sizeStyle(), height: sizeStyle() }}
						class="bg-transparent border-white m-6 border-2 rounded-full text-white flex justify-center items-center"
					/>
				)}</For>
			</div>
			<div class="more-lights flex relative flex-wrap justify-center mt-80">
				<For each={lights()}>{() => (
					<LightAuto>
						Hello
					</LightAuto>
				)}</For>
			</div>
			<Docs class="relative" docs={docs} />
		</Lights>
	)
}

export default Index
