// import { throttle } from "lodash-es"
import { createSignal, onCleanup, onMount } from "solid-js"

export function useWindowSize() {
	const winSize = ({
		innerWidth: width, innerHeight: height,
	}: typeof window = window) => ({ width, height })
	const [windowSize, setWindowSize] = createSignal(winSize())
	const listener = () => { setWindowSize(winSize()) }
	onMount(() => { window.addEventListener("resize", listener) })
	onCleanup(() => { window.removeEventListener("resize", listener) })
	return windowSize
}
