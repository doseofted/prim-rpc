import { Component, createSignal, onCleanup, onMount } from "solid-js"
import { addSignalMonitor, fps } from "../utils/tweakpane"
import { Light, Lights } from "../components/Lights"

const Index: Component = () => {
	const offsetXTimeline = [-300, 300]
	const [offsetX, setOffsetX] = createSignal(offsetXTimeline[0])
	let index = 0
	function run() {
		index += 1
		setOffsetX(offsetXTimeline[index % offsetXTimeline.length])
	}
	// eslint-disable-next-line solid/reactivity
	addSignalMonitor([offsetX, setOffsetX], "offset")
	onMount(() => {
		setTimeout(() => {
			run()
		}, 300)
		const interval = setInterval(run, 5000)
		onCleanup(() => {
			clearInterval(interval)
		})
	})
	return (
		<Lights
			options={{ size: 250, brightness: 1.5, offset: [offsetX(), 0], delay: 10 }}
			colors={["#ff0", "#0ff", "#f0f"]}
			fps={fps}
			background="transparent"
		>
			<div class="bg-black w-full h-100vh flex justify-center items-center">
				<Light />
			</div>
		</Lights>

	)
}

export default Index
