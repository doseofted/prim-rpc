import { Signal, onCleanup, onMount } from "solid-js"
import { Pane as PaneType, InputParams, InputBindingApi } from "tweakpane"

let pane: PaneType|undefined
if (import.meta.env.DEV) {
	const { Pane } = await import("tweakpane")
	pane = new Pane()
}

function addInputFromSignal<T>(signal: Signal<T>, key: string, params?: InputParams) {
	const [given, setGiven] = signal
	let input: InputBindingApi<unknown, unknown>|undefined
	onCleanup(() => {
		if (!input) { return }
		pane?.remove(input)
		input = undefined
	})
	onMount(() => {
		const compatible = new Proxy({ [key]: given() }, {
			get(_target, _p, _receiver) {
				return given()
			},
			set(_target, _p, value, _receiver) {
				setGiven(value)
				return true
			},
		})
		input = pane?.addInput(compatible, key, params)
	})
	return signal
}

export { pane, addInputFromSignal }
