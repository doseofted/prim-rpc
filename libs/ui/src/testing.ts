import { Signal, onCleanup } from "solid-js"
import type { Pane as PaneType, InputParams } from "tweakpane"

let pane: PaneType|undefined
if (import.meta.env.DEV) {
	const { Pane } = await import("tweakpane")
	pane = new Pane()
}

function addInputFromSignal<T>(signal: Signal<T>, key: string, params?: InputParams) {
	const [given, setGiven] = signal
	const compatible = new Proxy({ [key]: given() }, {
		get(_target, _p, _receiver) {
			return given()
		},
		set(_target, _p, value, _receiver) {
			setGiven(value)
			return true
		},
	})
	onCleanup(() => {
		if (!input) { return }
		pane?.remove(input)
	})
	const input = pane?.addInput(compatible, key, params)
	return signal
}

export { pane, addInputFromSignal as addInputSignal }
