import { Component, createSignal, onCleanup, onMount } from "solid-js"
import { addSignalMonitor, fps } from "../../utils/tweakpane"
import { Light, Lights } from "../../components/Lights"

const Index: Component = () => {
	const offsetXTimeline = [-300, 300]
	const brightnessTimeline = [0.5, 1.5, 1, 2]
	const [offsetX, setOffsetX] = createSignal(offsetXTimeline[0])
	const [brightness, setBrightness] = createSignal(brightnessTimeline[0])
	let index = 0
	function run() {
		index += 1
		setOffsetX(offsetXTimeline[index % offsetXTimeline.length])
		setBrightness(brightnessTimeline[index % brightnessTimeline.length])
	}
	// eslint-disable-next-line solid/reactivity
	addSignalMonitor([offsetX, setOffsetX], "offset")
	onMount(() => {
		setTimeout(() => {
			run()
		}, 300)
		const interval = setInterval(run, 3000)
		onCleanup(() => {
			clearInterval(interval)
		})
	})
	return (
		<Lights
			options={{ size: 250, brightness: brightness(), offset: [offsetX(), 0], delay: 50 }}
			colors={["#ff0", "#0ff", "#f0f"]}
			fps={fps}
			background="transparent">
			<div class="bg-black w-full h-100vh flex justify-center items-center">
				<Light />
			</div>
		</Lights>
	)
}

export default Index
