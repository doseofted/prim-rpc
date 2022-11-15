import { CanvasSpace, Circle, Pt, GroupLike, PtsCanvasRenderingContext2D, Const } from "pts"
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useMount, useUnmount, useWindowScroll, useWindowSize } from "react-use"
import { lighten, transparentize } from "color2k"
import { easeIn, easeOut } from "popmotion"
import { throttle, clamp, random, shuffle } from "lodash-es"
import { nanoid } from "nanoid"
import produce from "immer"

export interface LightOptions {
	/** Brightness from 0-2 */
	brightness: number
	/** Size of light itself, unrelated to brightness */
	size: number
	/** Color of the light when brightness is 1 */
	color: string
	/** Offset from the light's set position */
	offset?: [x: number, y: number]
	/** Rotation around light's center, excluding offset, from 0-360 */
	rotate?: number
	/** Delay setting of given options, useful for animations */
	delay?: number
}

interface LightInstance extends LightOptions {
	/** Unique identifier for given light */
	id: string
	/** Position of light, offset is given from this position */
	position: [x: number, y: number]
}

type LightEnv = {
	colors: string[]
	windowSize: { width: number; height: number }
	scrollPosition: { x: number; y: number }
	optionsShared: Partial<LightOptions> | undefined
	playing: boolean
}
type LightsContextType = [
	LightInstance[],
	LightEnv,
	{
		createLight(opts: LightOptions, position: [x: number, y: number]): LightInstance
		retrieveLight(id: string): LightInstance
		updateLightPosition(id: string, position: [x: number, y: number]): void
		updateLightOptions(id: string, options: Partial<LightOptions>): void
		removeLight(id: string): void
	}
]
const LightsContext = createContext<LightsContextType | null>(null)
/** Context as used by `Light` component. Don't use unless extending the `Light` component. */
export function useLights() {
	const ctx = useContext(LightsContext)
	if (!ctx) { throw new Error("Light was not used within Lights component") }
	return ctx
}
const defaultColors = ["#f0A3FF", "#6D53FF", "#1D0049", "#0069BA", "#5BB8FF"]
const defaultBackground = "#2D0D60"

// SECTION Lights provider
interface LightsProps {
	children?: React.ReactNode
	/** Use Tweakpane FPS monitor in development */
	// fps?: FpsControls
	/** Options used if none are provided to a light, overrides defaults */
	options?: Partial<LightOptions>
	/** Default colors to use for given lights if a color option is not provided (chosen at random) */
	colors?: string[]
	/** Background of canvas (set to "transparent" if background is not needed) */
	background?: string
	/** Lights blend better when canvas is blurred (amount can be adjusted as needed) */
	blur?: number
	/** Event handler on the first frame of animation */
	onFirstFrame?: () => void
}
export function Lights(props: LightsProps) {
	const { background, onFirstFrame, colors = defaultColors, blur = 15, options: optionsShared } = props
	const [locations, setLocation] = useState<Record<string, number>>({})
	const [lights, setLights] = useState<LightInstance[]>([])
	const [playing, setPlaying] = useState(false)
	const operations = {
		createLight(options: LightOptions, position: [x: number, y: number]) {
			const id = nanoid()
			let index: number
			setLights(
				produce(state => {
					const [x, y] = position ?? [0, 0]
					index = state.push({ ...options, ...optionsShared, position: [x, y], id }) - 1
				})
			)
			setLocation(produce(state => {
				state[id] = index
			}))
			return this.retrieveLight(id)
		},
		retrieveLight(id: string) {
			return lights[locations[id]]
		},
		updateLightPosition(id: string, position: [x: number, y: number]) {
			const index = locations[id]
			setLights(
				produce(state => {
					const [x, y] = position
					state[index] = { ...state[index], position: [x, y] }
				})
			)
		},
		updateLightOptions(id: string, options: Partial<LightOptions>) {
			const index = locations[id]
			setLights(
				produce(state => {
					state[index] = { ...state[index], ...optionsShared, ...options }
				})
			)
		},
		removeLight(id: string) {
			const index = locations[id]
			let deletedId: string
			const newLocations: Record<string, number> = {}
			setLights(
				produce(state => {
					deletedId = state[index].id
					state.splice(index, 1)
					state.slice(index).map((given, partialIndex) => {
						newLocations[given.id] = index + partialIndex
					})
				})
			)
			setLocation(produce(given => {
				delete given[deletedId]
				for (const [id, newIndex] of Object.entries(newLocations)) {
					given[id] = newIndex
				}
			}))
		},
	}
	const windowSize = useWindowSize()
	const scrollPosition = useWindowScroll()
	const fixedCss: React.CSSProperties = { position: "fixed", width: "100%", height: "100%", top: 0, left: 0 }
	const blurCss = useMemo<React.CSSProperties>(() => ({
		backgroundColor: "transparent",
		backdropFilter: `blur(${blur}px)`,
	}), [blur])
	return (
		<LightsContext.Provider
			value={[lights, { windowSize, scrollPosition, optionsShared, playing, colors }, operations]}>
			<LightsCanvas
				background={background}
				style={fixedCss}
				// fps={props.fps}
				onFirstFrame={() => {
					setPlaying(true)
					onFirstFrame?.()
				}}
			/>
			<div style={{ ...fixedCss, ...blurCss }} />
			{props.children}
		</LightsContext.Provider>
	)
}

// !SECTION

// SECTION Light with attributes
interface LightProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
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
 *     <Light>
 *       <p>This glows too!</p>
 *     </Light>
 *   </div>
 * </Lights>
 * ```
 */
export function Light(props: LightProps) {
	const { children, options: givenOptions, ...attrs } = props
	const [, env, operations] = useLights()
	const [color] = useState(shuffle(env.colors)[random(0, env.colors.length - 1)])
	const options = useMemo<LightOptions>(() => ({
		color,
		size: 50,
		offset: [0, 0],
		delay: 50,
		brightness: 1,
		...env.optionsShared,
		...givenOptions,
	}), [env.optionsShared, givenOptions])
	const div = useRef<HTMLDivElement>(null)
	/** Utility to get center of div relative to the page */
	function getCenter(rect: DOMRect) {
		const { x, y, width, height, left, top } = rect
		return { x: (x + width - left) / 2 + x, y: (y + height - top) / 2 + y }
	}
	let light: LightInstance | undefined
	const updatePosition = throttle(() => {
		if (!div.current) { return }
		if (!light) { return }
		const { x, y } = getCenter(div.current.getBoundingClientRect())
		operations.updateLightPosition(light?.id, [x, y])
	}, 10)
	useMount(() => {
		if (!div.current) { return }
		const { x, y } = getCenter(div.current.getBoundingClientRect())
		light = operations.createLight(options, [x, y])
	})
	useEffect(() => {
		if (!light) { return }
		operations.updateLightOptions(light.id, options)
	}, [options])
	useEffect(() => {
		console.log(env.scrollPosition, env.windowSize)
		updatePosition()
	}, [env.scrollPosition, env.windowSize])
	useEffect(() => {
		if (!div.current) { return }
		const resizeObserver = new ResizeObserver(entries => {
			if (entries.length < 1) {
				return
			}
			updatePosition()
		})
		resizeObserver.observe(div.current)
		return () => { resizeObserver.disconnect() }
	}, [div])
	useUnmount(() => {
		if (!light) { return }
		operations.removeLight(light.id)
	})
	return (
		<div {...attrs} ref={div}>
			{children}
		</div>
	)
}
// !SECTION

// SECTION Lights canvas
interface LightCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
	background?: string
	// TODO: add back fps monitor
	// fps?: FpsControls
	onFirstFrame?: () => void
}
function LightsCanvas(props: LightCanvasProps) {
	const {
		background = defaultBackground,
		onFirstFrame,
		...attrs
	} = props
	const ctx = useLights()
	if (!ctx) {
		return <></>
	}
	const [lights] = ctx
	const canvas = useRef<HTMLCanvasElement>(null)
	let space: CanvasSpace | undefined
	useEffect(() => {
		if (!space) { return }
		if (!background) { return }
		space.background = background
	}, [background])
	useMount(() => {
		if (!canvas.current) {
			return
		}
		space = new CanvasSpace(canvas.current)
		space.setup({ bgcolor: props.background, resize: true })
		const form = space.getForm()
		const delays: { [prop: string]: Pt } = {}
		/**
		 * Given a `Pt`, delay its movement over time.
		 * [This example is a useful reference](https://ptsjs.org/demo/edit/?name=create.gridcells).
		 */
		function delayPt(given: Pt, delay: number, prop: string | (string | number)[]) {
			const accessor = Array.isArray(prop) ? prop.join("-") : prop
			const givenDelayed = delays[accessor]
			const delaySet = typeof givenDelayed !== "undefined" && givenDelayed !== given
			if (delaySet) {
				const velocity = given.$subtract(givenDelayed).$divide(delay)
				delays[accessor] = givenDelayed.$add(velocity)
			} else {
				delays[accessor] = given
			}
			return delays[accessor]
		}
		/** Same as`delayPt()` but for numbers */
		function delayNumber(given: number, delay: number, prop: string | (string | number)[]) {
			return delayPt(new Pt([given]), delay, prop)[0]
		}
		space.add(_seconds => {
			// props.fps?.begin()
			if (!space) {
				return
			}
			form.composite("screen")
			// form.ctx.filter = "blur(100px)"
			for (const [index, light] of lights.entries()) {
				const {
					position = [0, 0],
					color,
					size,
					brightness,
					offset: offsetCoords = [0, 0],
					delay: delayStrength = 1,
					rotate: rotateAmount = 0,
				} = light
				const delay = clamp(delayStrength, 1, Infinity)
				const brightnessDelayed = delayNumber(brightness, delay, [index, "brightness"])
				let center = new Pt(position)
				const offset = new Pt(offsetCoords)
				const offsetDelayed = delayPt(offset, delay, [index, "offset"])
				const rotate = rotateAmount % 360
				const rotateDelayed = delayNumber(rotate, delay, [index, "rotate"])
				center = center.$add(offsetDelayed).rotate2D(rotateDelayed * (Const.pi / 180), center)
				const colorStart = transparentize(
					lighten(color, (clamp(brightnessDelayed, 1.5, 2) - 1.5) * 2),
					easeIn(clamp(1 - brightnessDelayed, 0, 1))
				)
				const colorEnd = transparentize(colorStart, 1)
				const sizeDelayed = delayNumber(size, delay, [index, "size"])
				const circleSize = sizeDelayed * easeOut(brightnessDelayed / 2)
				const gradientColor = temporaryGradient(form.ctx, [colorStart, colorEnd])
				const gradientShape = gradientColor(
					Circle.fromCenter(center, (circleSize * easeOut(clamp(brightnessDelayed - 1, 0, 1))) / 2),
					Circle.fromCenter(center, circleSize + 0.01)
				)
				const lightShape = Circle.fromCenter(center, circleSize)
				form.fill(gradientShape).stroke(false).circle(lightShape)
			}
			// props.fps?.end()
		})
		space.play()
		onFirstFrame?.()
	})
	useUnmount(() => {
		space?.dispose()
	})
	return (
		<div {...attrs}>
			<canvas ref={canvas} />
		</div>
	)
}
// !SECTION

/**
 * This is a temporary replacement for PTS gradient method while my PR is being reviewed in the official library.
 * Replace `temporaryGradient(form.ctx, ...)` with `form.gradient(...)` once approved.
 *
 * - [My PR](https://github.com/williamngan/pts/pull/196)
 * - [Original gradient function](https://github.com/williamngan/pts/blob/5aacde2939e339892fd001885f964d5c52b057c5/src/Canvas.ts#L617-L641)
 */
function temporaryGradient(
	ctx: PtsCanvasRenderingContext2D,
	stops: [number, string][] | string[]
): (area1: GroupLike, area2?: GroupLike) => CanvasGradient {
	const vals: [number, string][] = []
	if (stops.length < 2) (stops as [number, string][]).push([0.99, "#000"], [1, "#000"])

	for (let i = 0, len = stops.length; i < len; i++) {
		const t: number = typeof stops[i] === "string" ? i * (1 / (stops.length - 1)) : (stops[i][0] as number)
		const v: string = typeof stops[i] === "string" ? (stops[i] as string) : stops[i][1]
		vals.push([t, v])
	}

	return (area1: GroupLike, area2?: GroupLike) => {
		const grad = area2
			? ctx.createRadialGradient(
				area1[0][0],
				area1[0][1],
				Math.abs(area1[1][0]),
				area2[0][0],
				area2[0][1],
				Math.abs(area2[1][0])
			)
			: ctx.createLinearGradient(area1[0][0], area1[0][1], area1[1][0], area1[1][1])

		for (let i = 0, len = vals.length; i < len; i++) {
			grad.addColorStop(vals[i][0], vals[i][1])
		}

		return grad
	}
}
