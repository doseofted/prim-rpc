import { Signal, onCleanup, onMount, createEffect } from "solid-js"
import { Pane as PaneType, InputParams, InputBindingApi, FolderApi, Pane, TabPageApi, MonitorBindingApi, MonitorParams, FolderParams } from "tweakpane"
import type { Promisable } from "type-fest"
import * as EssentialsPlugin from "@tweakpane/plugin-essentials"

let pagePane: PaneType|undefined
if (import.meta.env.DEV) {
	const { Pane } = await import("tweakpane")
	pagePane = new Pane()
}

pagePane?.registerPlugin(EssentialsPlugin)
export interface FpsControls { begin(): void, end(): void }
export const fps = pagePane?.addBlade({
	view: "fpsgraph",
	label: "fps",
	lineCount: 1,
}) as unknown as FpsControls

/** Create a proxy object around given signal so that Tweakpane can read/write to signal */
function createProxyFromSignal<T>(signal: Signal<T>, key: string) {
	const [given, setGiven] = signal
	const compatible = new Proxy({ [key]: given() }, {
		get: (_target, p, _receiver) => p === key ? given() : undefined,
		set: (_target, p, value, _receiver) => {
			const setIt = p === key
			if (setIt) { setGiven(value) }
			return setIt
		},
	})
	return compatible
}

function addSignalInput<T>(signal: Signal<T>, key: string, params?: InputParams, pane: Promisable<TabPageApi|FolderApi|Pane|undefined> = pagePane) {
	let input: InputBindingApi<unknown, unknown>|undefined
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	onCleanup(async () => {
		if (!input) { return }
		(await pane)?.remove(input)
		input = undefined
	})
	createEffect(() => {
		const [given] = signal
		given()
		input?.refresh()
	})
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	onMount(async () => {
		const compatible = createProxyFromSignal(signal, key)
		input = (await pane)?.addInput(compatible, key, params)
	})
	return signal
}

function addSignalMonitor<T>(signal: Signal<T>, key: string, params?: MonitorParams, pane: Promisable<TabPageApi|FolderApi|Pane|undefined> = pagePane) {
	let input: MonitorBindingApi<unknown>|undefined
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	onCleanup(async () => {
		if (!input) { return }
		(await pane)?.remove(input)
		input = undefined
	})
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	onMount(async () => {
		const compatible = createProxyFromSignal(signal, key)
		input = (await pane)?.addMonitor(compatible, key, params)
	})
	return signal
}

function addFolderToPane (options: FolderParams, pane: TabPageApi|FolderApi|Pane|undefined = pagePane) {
	let folder: FolderApi|undefined
	onCleanup(() => {
		if (!folder) { return }
		pane?.remove(folder)
	})
	return new Promise<typeof folder>((resolve) => {
		onMount(() => {
			folder = pane?.addFolder(options)
			resolve(folder)
		})
	})
}

export {
	pagePane as pane,
	addSignalInput,
	addSignalMonitor,
	addFolderToPane,
}
