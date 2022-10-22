import { Component, onCleanup, onMount, JSX, splitProps, createContext, useContext, createMemo, createSignal, Accessor, createEffect } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { CanvasSpace, Circle, Pt } from "pts"
import { transparentize } from "color2k"
import { fps, FpsControls } from "../utils/tweakpane"
import { nanoid } from "nanoid"

interface LightOptions {
	brightness: number
	color: string
}

interface LightInstance extends LightOptions {
	id: string
	x: number
	y: number
}

type LightsContextType = [LightInstance[], Accessor<{ width: number, height: number }>, Accessor<{ x: number, y: number }>, {
	createLight(opts: LightOptions, position: [x: number, y: number]): LightInstance
	retrieveLight(id: string): LightInstance
	updateLightPosition(id: string, position: [x: number, y: number]): void
	updateLightOptions(id: string, options: LightOptions): void
	removeLight(id: string): void
}]
const LightsContext = createContext<LightsContextType>()

interface LightsProps {
	children: JSX.Element | JSX.Element[]
	fps?: FpsControls
}
export function Lights(props: LightsProps) {
	// eslint-disable-next-line solid/reactivity, @typescript-eslint/no-unused-vars
	const [lights, setLights] = createStore<LightInstance[]>([])
	const locations: Record<string, number> = {}
	const operations = {
		createLight(options: LightOptions, position: [x: number, y: number]) {
			const id = nanoid()
			setLights(produce(state => {
				const [x, y] = position ?? [0, 0]
				const index = state.push({ ...options, x, y, id }) - 1
				locations[id] = index
			}))
			return this.retrieveLight(id)
		},
		// eslint-disable-next-line solid/reactivity
		retrieveLight(id: string) {
			return lights[locations[id]]
		},
		updateLightPosition(id: string, position: [x: number, y: number]) {
			const index = locations[id]
			setLights(produce(state => {
				const [x, y] = position
				state[index] = { ...state[index], x, y }
			}))
		},
		updateLightOptions(id: string, options: LightOptions) {
			const index = locations[id]
			setLights(produce(state => {
				state[index] = { ...state[index], ...options }
			}))
		},
		removeLight(id: string) {
			const index = locations[id]
			setLights(produce(state => {
				state.splice(index, 1)
				state.slice(index).map((given, partialIndex) => {
					locations[given.id] = index + partialIndex
				})
			}))
		},
	}
	const winSize = ({ innerWidth: width, innerHeight: height } = window) => ({ width, height })
	const [windowSize, setWindowSize] = createSignal(winSize())
	const winListener = () => setWindowSize(winSize())
	onMount(() => window.addEventListener("resize", winListener))
	onCleanup(() => window.removeEventListener("resize", winListener))
	const scrollPosition = ({ scrollX: x, scrollY: y } = window) => ({ x, y })
	const scrollListener = () => setScroll(scrollPosition())
	const [scroll, setScroll] = createSignal(scrollPosition())
	onMount(() => document.addEventListener("scroll", scrollListener))
	onCleanup(() => document.removeEventListener("scroll", scrollListener))
	return (
		<LightsContext.Provider value={[lights, windowSize, scroll, operations]}>
			<LightCanvas style={{ position: "fixed", width: "100%", height: "100%", top: 0, left: 0 }} />
			{props.children}
		</LightsContext.Provider>
	)
}
export function useLights() {
	return useContext(LightsContext)
}

interface LightProps extends JSX.HTMLAttributes<HTMLDivElement> {
	children?: JSX.Element | JSX.Element[]
}
/**
 * Place a `Light` component anywhere inside of a `Lights` component and a light
 * will glow behind the given element. `Light` components are just a "div"
 * element which can be used to either encapsulate some other element or be
 * used inside of some other container.
 * 
 * @example
 * 
 * ```tsx
 * <Lights>
 *   <div class="flex">
 *     <Light>
 *       <p>It glows!</p>
 *     </Light>
 *   </div>
 * </Lights>
 * ``` 
 */
export const Light: Component<LightProps> = (p) => {
	const [props, attrs] = splitProps(p, ["children"])
	let div: HTMLDivElement
	const [, windowSize, scroll, operations] = useLights() ?? []
	function getCenter(rect: DOMRect) {
		const { x, y, width, height, left, top } = rect
		return { x: (x + width - left) / 2 + x, y: (y + height - top) / 2 + y }
	}
	onMount(() => {
		if (!operations) { return }
		const { x, y } = getCenter(div.getBoundingClientRect())
		const light = operations.createLight({ brightness: 1, color: "#fff" }, [x, y])
		createEffect(() => {
			windowSize?.(); scroll?.()
			const { x, y } = getCenter(div.getBoundingClientRect())
			operations?.updateLightPosition(light.id, [x, y])
		})
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { target } = entry
				const { x, y } = getCenter(target.getBoundingClientRect())
				operations?.updateLightPosition(light.id, [x, y])
			}
		})
		observer.observe(div)
		onCleanup(() => {
			observer.disconnect()
			operations?.removeLight(light.id)
		})
	})
	return <div {...attrs} ref={e => div = e}>{props.children}</div>
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LightCanvasProps extends JSX.HTMLAttributes<HTMLDivElement> { }
/** Canvas where lights are drawn */
const LightCanvas: Component<LightCanvasProps> = (p) => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [_props, attrs] = splitProps(p, [])
	const [lights = []] = useLights() ?? []
	let canvas: HTMLCanvasElement | undefined
	let space: CanvasSpace | undefined
	const lightsConfigured = createMemo(() => lights.map(({ x, y }, i) => {
		const color = ["#00ffff", "#ffff00", "#ff00ff"][i % 3]
		return { x, y, color }
	}))
	onMount(() => {
		if (!canvas) { return }
		space = new CanvasSpace(canvas)
		space.setup({ bgcolor: "#000", resize: true })
		const form = space.getForm()
		// eslint-disable-next-line solid/reactivity -- animation function catches signal updates
		space.add(() => {
			fps.begin()
			if (!space) { return }
			form.composite("screen")
			for (const light of lightsConfigured()) {
				const { x, y, color: colorStart } = light
				const center = new Pt(x, y)
				const circleSize = 150
				const colorEnd = transparentize(colorStart, 1)
				const gradientColor = form.gradient([colorStart, colorEnd])
				const gradientShape = gradientColor(
					Circle.fromCenter(center, 0),
					Circle.fromCenter(center, circleSize),
				)
				form.fill(gradientShape).stroke(false).circle(Circle.fromCenter(center, circleSize))
			}
			fps.end()
		})
		space.play()
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

