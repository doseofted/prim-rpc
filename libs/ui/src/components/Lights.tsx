import { Component, onCleanup, onMount, JSX, splitProps, createContext, useContext } from "solid-js"
import { createStore, produce, SetStoreFunction } from "solid-js/store"
import { CanvasSpace, Pt } from "pts"

interface LightOptions {
	brightness: number
	color: string
}

interface LightInstance extends LightOptions {
	id: number
	x: number
	y: number
}

const LightsContext = createContext<[get: LightInstance[], set: SetStoreFunction<LightInstance[]>]>()

export function LightsProvider(props: { children: JSX.Element | JSX.Element[] }) {
	// eslint-disable-next-line solid/reactivity, @typescript-eslint/no-unused-vars
	const lights = createStore<LightInstance[]>([])
	return (
		<LightsContext.Provider value={lights}>
			<Lights style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0 }} />
			{props.children}
		</LightsContext.Provider>
	)
}
export function useLights() {
	return useContext(LightsContext)
}

export const Light: Component = () => {
	const [, setLights] = useLights() ?? []
	let div: HTMLDivElement
	let observer: ResizeObserver
	onMount(() => {
		const { x, y } = div.getBoundingClientRect()
		function setupResizeObserver(givenIndex: number) {
			observer = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const { target } = entry
					const { x, y } = target.getBoundingClientRect()
					setLights?.(produce(state => {
						state[givenIndex].x = x
						state[givenIndex].y = y
					}))
				}
			})
			observer.observe(div)
			onCleanup(() => observer.disconnect())
		}
		setLights?.(produce(state => {
			const givenIndex = state.push({
				id: state.length + 1,
				x, y,
				brightness: 1,
				color: "#fff",
			}) - 1
			setupResizeObserver(givenIndex)
		}))
	})
	return <div ref={e => div = e} />
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
	// ...
}
const Lights: Component<Props> = (p) => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [_props, attrs] = splitProps(p, [])
	const [lights = []] = useLights() ?? []
	let canvas: HTMLCanvasElement | undefined
	let space: CanvasSpace | undefined
	/* createEffect(() => {
		console.log(lights?.map(({ x, y }) => `${x}x${y}`).join(", "))
	}) */
	onMount(() => {
		if (!canvas) { return }
		space = new CanvasSpace(canvas)
		space.setup({ bgcolor: "#000", resize: true })
		const form = space.getForm()
		space.add(() => {
			if (!space) { return }
			for (const light of lights) {
				const { x, y } = light
				form.point(new Pt({ x, y }), 10)
			}
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
