import {
	Component, onCleanup, onMount, JSX, splitProps, createContext, useContext,
	createMemo, createSignal, Accessor, createEffect, mergeProps,
} from "solid-js"
import { createStore, produce } from "solid-js/store"
import { CanvasSpace, Circle, Pt, GroupLike, PtsCanvasRenderingContext2D, Const } from "pts"
import { lighten, transparentize } from "color2k"
import { easeIn, easeOut } from "popmotion"
import { throttle, clamp, random } from "lodash-es"
import { nanoid } from "nanoid"
import { fps, FpsControls } from "../utils/tweakpane"

interface LightOptions {
	/** Brightness from 0-2 */
	brightness: number
	/** Size of light itself, unrelated to brightness */
	size: number
	/** Color of the light when brightness is 1 */
	color: string
	/** Offset from the light's set position */
	offset?: [x: number, y: number],
	/** Rotation around light's center, excluding offset */
	rotate?: number
	/** Delay offset and/or rotation, useful for animations */
	delay?: number
}

interface LightInstance extends LightOptions {
	/** Unique identifier for given light */
	id: string
	/** Position of light, offset is given from this position */
	position: [x: number, y: number]
}

type LightEnv = {
	windowSize: Accessor<{ width: number, height: number }>
	scrollPosition: Accessor<{ x: number, y: number }>
	optionsShared: Accessor<Partial<LightOptions> | undefined>
}
type LightsContextType = [LightInstance[], LightEnv, {
	createLight(opts: LightOptions, position: [x: number, y: number]): LightInstance
	retrieveLight(id: string): LightInstance
	updateLightPosition(id: string, position: [x: number, y: number]): void
	updateLightOptions(id: string, options: Partial<LightOptions>): void
	removeLight(id: string): void
}]
const LightsContext = createContext<LightsContextType>()

interface LightsProps {
	children: JSX.Element | JSX.Element[]
	/** Use Tweakpane FPS monitor in development */
	fps?: FpsControls
	/** Options used if none are provided to a light, overrides defaults */
	options?: Partial<LightOptions>
}
/** Provider for `Light` component */
export function Lights(props: LightsProps) {
	const [lights, setLights] = createStore<LightInstance[]>([])
	const optionsShared = createMemo(() => props.options)
	const locations: Record<string, number> = {}
	const operations = {
		createLight(options: LightOptions, position: [x: number, y: number]) {
			const id = nanoid()
			setLights(produce(state => {
				const [x, y] = position ?? [0, 0]
				const index = state.push({ ...options, ...props.options, position: [x, y], id }) - 1
				locations[id] = index
			}))
			return this.retrieveLight(id)
		},
		// eslint-disable-next-line solid/reactivity -- note: return value is from Store, may need to be wrapped in effect
		retrieveLight(id: string) {
			return lights[locations[id]]
		},
		updateLightPosition(id: string, position: [x: number, y: number]) {
			const index = locations[id]
			setLights(produce(state => {
				const [x, y] = position
				state[index] = { ...state[index], position: [x, y] }
			}))
		},
		updateLightOptions(id: string, options: Partial<LightOptions>) {
			const index = locations[id]
			setLights(produce(state => {
				state[index] = { ...state[index], ...props.options, ...options }
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
	// track position window resize
	const winSize = ({ innerWidth: width, innerHeight: height } = window) => ({ width, height })
	const [windowSize, setWindowSize] = createSignal(winSize())
	const winListener = throttle(() => setWindowSize(winSize()), 15)
	onMount(() => window.addEventListener("resize", winListener))
	onCleanup(() => window.removeEventListener("resize", winListener))
	// track position on scroll
	const scrollPos = ({ scrollX: x, scrollY: y } = window) => ({ x, y })
	const scrollListener = throttle(() => setScroll(scrollPos()), 15)
	const [scrollPosition, setScroll] = createSignal(scrollPos())
	onMount(() => document.addEventListener("scroll", scrollListener))
	onCleanup(() => document.removeEventListener("scroll", scrollListener))
	return (
		<LightsContext.Provider value={[lights, { windowSize, scrollPosition, optionsShared }, operations]}>
			<LightCanvas style={{ position: "fixed", width: "100%", height: "100%", top: 0, left: 0 }} />
			{props.children}
		</LightsContext.Provider>
	)
}
function useLights() {
	return useContext(LightsContext)
}

interface LightProps extends JSX.HTMLAttributes<HTMLDivElement> {
	children?: JSX.Element | JSX.Element[]
	options?: Partial<LightOptions>
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
	const [props, attrs] = splitProps(p, ["children", "options"])
	const defaultColors = ["#f0A3FF", "#6D53FF", "#1D0049", "#0069BA", "#5BB8FF"]
	const color = defaultColors[random(0, defaultColors.length - 1)]
	const ctx = useLights()
	// eslint-disable-next-line solid/components-return-once -- Light was not used in Lights provider
	if (!ctx) { return <></> }
	const [, env, operations] = ctx
	const options = createMemo<LightOptions>(() => ({
		color, size: 50, offset: [0, 0], delay: 50, brightness: 1,
		...env?.optionsShared(),
		...props.options,
	}))
	let div: HTMLDivElement
	/** Utility to get center of div relative to the page */
	function getCenter(rect: DOMRect) {
		const { x, y, width, height, left, top } = rect
		return { x: (x + width - left) / 2 + x, y: (y + height - top) / 2 + y }
	}
	onMount(() => {
		if (!operations) { return }
		const { x, y } = getCenter(div.getBoundingClientRect())
		const light = operations.createLight(options(), [x, y])
		const updatePosition = throttle(() => {
			const { x, y } = getCenter(div.getBoundingClientRect())
			operations?.updateLightPosition(light.id, [x, y])
		}, 10)
		createEffect(() => {
			operations?.updateLightOptions(light.id, options())
		})
		createEffect(() => {
			env?.windowSize(); env?.scrollPosition()
			updatePosition() // track position of div given changes to environment
		})
		const resizeObserver = new ResizeObserver((entries) => {
			if (entries.length < 1) { return }
			updatePosition()
		})
		resizeObserver.observe(div)
		onCleanup(() => {
			resizeObserver.disconnect()
			operations?.removeLight(light.id)
		})
	})
	return (
		<div
			{...attrs}
			ref={e => div = e}
		>
			{props.children}
		</div>
	)
}

interface LightCanvasProps extends JSX.HTMLAttributes<HTMLDivElement> {
	background?: string
}
/** Canvas where lights are drawn */
const LightCanvas: Component<LightCanvasProps> = (p) => {
	const pDefaults = mergeProps<LightCanvasProps[]>({ background: "#2D0D60" }, p)
	const [props, attrs] = splitProps(pDefaults, ["background"])
	const ctx = useLights()
	// eslint-disable-next-line solid/components-return-once -- component was misused if context is missing
	if (!ctx) { return <></> }
	const [lights] = ctx
	let canvas: HTMLCanvasElement | undefined
	let space: CanvasSpace | undefined
	createEffect(() => {
		if (!space) { return }
		if (!props.background) { return }
		space.background = props.background
	})
	onMount(() => {
		if (!canvas) { return }
		space = new CanvasSpace(canvas)
		space.setup({ bgcolor: props.background, resize: true })
		const form = space.getForm()
		const offsetDelayed: Pt[] = []
		const rotateDelayed: number[] = []
		// eslint-disable-next-line solid/reactivity -- animation function catches signal updates
		space.add((_seconds) => {
			fps.begin()
			if (!space) { return }
			form.composite("screen")
			for (const [index, light] of lights.entries()) {
				const {
					position, color, size, brightness,
					offset: offsetCoords = [0, 0], delay: delayStrength = 1, rotate: rotateAmount = 0,
				} = light
				const delay = clamp(delayStrength, 1, Infinity)
				let center = new Pt(position)
				const offset = new Pt(offsetCoords)
				// NOTE: useful example of delayed movement at https://ptsjs.org/demo/edit/?name=create.gridcells
				offsetDelayed[index] = offsetDelayed[index]
					? offsetDelayed[index].$add(offset.$subtract(offsetDelayed[index]).$divide(delay))
					: offset
				const rotate = rotateAmount
				rotateDelayed[index] = rotateDelayed[index]
					? rotateDelayed[index] + ((rotate - rotateDelayed[index]) / delay)
					: rotate
				center = center.$add(offsetDelayed[index]).rotate2D(rotateDelayed[index] * (Const.pi / 180), center)
				const colorStart = transparentize(
					lighten(color, (clamp(brightness, 1.5, 2) - 1.5) * 2),
					easeIn(clamp(1 - brightness, 0, 1)),
				)
				const colorEnd = transparentize(colorStart, 1)
				const circleSize = size * easeOut(brightness / 2)
				const gradientColor = temporaryGradient(form.ctx, [colorStart, colorEnd])
				const gradientShape = gradientColor(
					Circle.fromCenter(center, circleSize * easeOut(clamp(brightness - 1, 0, 1)) / 2),
					Circle.fromCenter(center, circleSize + 0.01),
				)
				const lightShape = Circle.fromCenter(center, circleSize)
				form.fill(gradientShape).stroke(false).circle(lightShape)
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

/**
 * This is a temporary replacement for PTS gradient method while my PR is being reviewed in the official library.
 * Replace `temporaryGradient(form.ctx, ...)` with `form.gradient(...)` once approved.
 *
 * - [My PR](https://github.com/williamngan/pts/pull/196)
 * - [Original gradient function](https://github.com/williamngan/pts/blob/5aacde2939e339892fd001885f964d5c52b057c5/src/Canvas.ts#L617-L641)
 */
function temporaryGradient(ctx: PtsCanvasRenderingContext2D, stops: [number, string][] | string[]): ((area1: GroupLike, area2?: GroupLike) => CanvasGradient) {
	const vals: [number, string][] = []
	if (stops.length < 2) (stops as [number, string][]).push([0.99, "#000"], [1, "#000"])

	for (let i = 0, len = stops.length; i < len; i++) {
		const t: number = typeof stops[i] === "string" ? i * (1 / (stops.length - 1)) : stops[i][0] as number
		const v: string = typeof stops[i] === "string" ? stops[i] as string : stops[i][1]
		vals.push([t, v])
	}

	return (area1: GroupLike, area2?: GroupLike) => {
		const grad = area2
			? ctx.createRadialGradient(area1[0][0], area1[0][1], Math.abs(area1[1][0]), area2[0][0], area2[0][1], Math.abs(area2[1][0]))
			: ctx.createLinearGradient(area1[0][0], area1[0][1], area1[1][0], area1[1][1])

		for (let i = 0, len = vals.length; i < len; i++) {
			grad.addColorStop(vals[i][0], vals[i][1])
		}

		return grad
	}
}
