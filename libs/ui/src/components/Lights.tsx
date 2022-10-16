import { Component, onCleanup, onMount, JSX, splitProps, createContext, useContext, createEffect, createSignal } from "solid-js"
import { CanvasSpace } from "pts"

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
	// ...
}

// eslint-disable-next-line solid/reactivity
export const LightsContext = createContext(createSignal(1))

const Lights: Component<Props> = (p) => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [_props, attrs] = splitProps(p, [])
	const [lightsCtx] = useContext(LightsContext)
	let canvas: HTMLCanvasElement | undefined
	let space: CanvasSpace | undefined
	createEffect(() => {
		console.log("Lights context:", lightsCtx())
	})
	onMount(() => {
		if (!canvas) { return }
		space = new CanvasSpace(canvas)
		space.setup({ bgcolor: "#fff", resize: true })
		const form = space.getForm()
		space.add(() => {
			if (!space) { return }
			form.point(space.pointer, lightsCtx())
		})
		space.play().bindMouse()
	})
	onCleanup(() => {
		space?.dispose()
	})
	return (
		<div {...attrs}>
			<canvas ref={ref => canvas = ref} />
		</div>
	)
}

export default Lights
