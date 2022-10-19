import { Component, onCleanup, onMount, JSX, splitProps, createContext, useContext, createMemo } from "solid-js"
import { createStore, produce, SetStoreFunction } from "solid-js/store"
import { CanvasSpace, Circle, Pt } from "pts"
import { transparentize } from "color2k"
import { FpsControls } from "../utils/tweakpane"

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

interface LightsProps {
	children: JSX.Element | JSX.Element[]
	fps?: FpsControls
}
export function Lights(props: LightsProps) {
	// eslint-disable-next-line solid/reactivity, @typescript-eslint/no-unused-vars
	const lights = createStore<LightInstance[]>([])
	return (
		<LightsContext.Provider value={lights}>
			<LightCanvas style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0 }} />
			{props.children}
		</LightsContext.Provider>
	)
}
export function useLights() {
	return useContext(LightsContext)
}

interface LightProps { children?: JSX.Element | JSX.Element[] }
/**
 * Place a `Light` component inside of a `Lights` component and a light
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
export const Light: Component<LightProps> = (props) => {
	let div: HTMLDivElement
	const [, setLights] = useLights() ?? []
	onMount(() => {
		function setupResizeObserver(givenIndex: number) {
			const observer = new ResizeObserver((entries) => {
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
			onCleanup(() => {
				observer.disconnect()
				setLights?.(produce(state => {
					state.splice(givenIndex, 1)
				}))
			})
		}
		const { x, y } = div.getBoundingClientRect()
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
	return <div ref={e => div = e}>{props.children}</div>
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
			if (!space) { return }
			form.composite("screen")
			for (const light of lightsConfigured()) {
				const { x, y, color: colorStart } = light
				const center = new Pt(x, y)
				const circleSize = 150
				const colorEnd = transparentize(colorStart, 1)
				const gradientColor = form.gradient([colorStart, colorEnd])
				const gradientShape = gradientColor(Circle.fromCenter(center, 0), Circle.fromCenter(center, circleSize))
				form.fill(gradientShape).stroke(false).circle(Circle.fromCenter(center, circleSize))
			}
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

