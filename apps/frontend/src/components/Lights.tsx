import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useImmer } from "use-immer"
import { nanoid } from "nanoid"
import { useWindowScroll, useWindowSize } from "react-use"
import { clamp, random, shuffle } from "lodash-es"
import { CanvasSpace, Circle, Pt, GroupLike, PtsCanvasRenderingContext2D, Const, CanvasForm } from "pts"
import { lighten, transparentize } from "color2k"
import { easeIn, easeOut } from "popmotion"
import { PtsCanvas } from "react-pts-canvas"
import type { RequireExactlyOne } from "type-fest"

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

type LightsState = {
	lights: {
		[id: string]: LightInstance
	}
	windowSize: { width: number; height: number }
	windowScroll: { x: number; y: number }
	colors: string[]
}
type LightsActions = {
	createLight(opts: RequireExactlyOne<Partial<LightOptions>, "color">, position: [x: number, y: number]): string
	retrieveLight(id: string): LightInstance
	updateLightPosition(id: string, position: [x: number, y: number]): void
	updateLightOptions(id: string, options: Partial<LightOptions>): void
	removeLight(id: string): void
}
type LightsContext = [LightsState, LightsActions]
const LightsContext = createContext<null | LightsContext>(null)
function useLights() {
	const ctx = useContext(LightsContext)
	if (!ctx) {
		throw new Error("Lights context must be used in Lights component.")
	}
	return ctx
}

/** Names come from Coolors app */
export enum NamedColor {
	Mauve1 = 0,
	Mauve2, // increase chances of using this color
	MajorelleBlue,
	RussianViolet,
	GreenBlue,
	BlueJeans,
	ElectricBlue,
}
// LINK https://coolors.co/f0a3ff-6d53ff-1d0049-0069ba-5bb8ff-4aedff
export const defaultColors = ["#f0A3FF", "#f0A3FF", "#6D53FF", "#1D0049", "#0069BA", "#5BB8FF", "#4AEDFF"]
export const defaultBackground = "#2D0D60"

export interface LightsProps {
	children?: React.ReactNode | React.ReactNode[]
	/** Options used if none are provided to a light, overrides defaults */
	options?: Partial<LightOptions>
	/** Default colors to use for given lights if a color option is not provided (chosen at random) */
	colors?: string[]
	/** Background of canvas (set to "transparent" if background is not needed) */
	background?: string
	/** Lights blend better when canvas is blurred (amount in pixels can be adjusted as needed) */
	blur?: number
	/** Saturate given colors as needed (given as 0-2, representing 0-200%) */
	saturate?: number
	/** Event handler on the first frame of animation */
	onFirstFrame?: () => void
}
/** Provider for `Light` components */
export function Lights(props: LightsProps) {
	const { children, options: sharedOptions = {}, onFirstFrame } = props
	const [lights, setLights] = useImmer<{ [id: string]: LightInstance }>({})
	const windowSize = useWindowSize(0, 0)
	const windowScroll = useWindowScroll()
	const colors = useMemo(() => props.colors ?? defaultColors, [props.colors])
	const background = useMemo(() => props.background ?? defaultBackground, [props.background])
	const blur = useMemo(() => props.blur ?? 15, [props.blur])
	const saturate = useMemo(() => clamp(props.saturate ?? 1, 0, 2), [props.saturate])
	const ctx = useMemo<LightsContext>(
		() => [
			{ lights, windowSize, windowScroll, colors },
			{
				createLight(opts, position) {
					const id = nanoid()
					setLights(draft => {
						const [x, y] = position ?? [0, 0]
						draft[id] = {
							// defaults
							brightness: 1,
							size: 50,
							offset: [0, 0],
							rotate: 0,
							delay: 50,
							// shared
							...sharedOptions,
							// given
							...opts,
							position: [x, y],
							// created
							id,
						} as LightInstance
					})
					return id
				},
				updateLightOptions(id, options) {
					setLights(draft => {
						const light = draft[id]
						draft[id] = { ...sharedOptions, ...light, ...options }
					})
				},
				updateLightPosition(id, position) {
					setLights(draft => {
						const light = draft[id]
						draft[id] = { ...light, position }
					})
				},
				removeLight(id) {
					setLights(draft => {
						delete draft[id]
					})
				},
				retrieveLight(id) {
					return lights[id]
				},
			},
		],
		[sharedOptions, lights, windowSize, windowScroll]
	)
	const fixedCss: React.CSSProperties = { position: "fixed", width: "100%", height: "100%", top: 0, left: 0 }
	const blurCss = useMemo<React.CSSProperties>(
		() => ({
			...fixedCss,
			backgroundColor: "transparent",
			backdropFilter: `blur(${blur}px) saturate(${saturate * 100}%)`,
			WebkitBackdropFilter: `blur(${blur}px) saturate(${saturate * 100}%)`, // Safari-specific
		}),
		[blur, saturate]
	)
	return (
		<LightsContext.Provider value={ctx}>
			<LightsCanvas background={background} style={fixedCss} onFirstFrame={() => onFirstFrame?.()} />
			<div style={blurCss} />
			{children}
		</LightsContext.Provider>
	)
}

/** Utility to get center of div relative to the page */
function getCenter(div?: HTMLDivElement | null) {
	const rect = div?.getBoundingClientRect()
	if (!rect) {
		return { x: 0, y: 0 }
	}
	const { x, y, width, height, left, top } = rect
	return { x: (x + width - left) / 2 + x, y: (y + height - top) / 2 + y }
}

export interface LightProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode | React.ReactNode[]
	options?: Partial<LightOptions>
	onOptionsSet?: (options: Partial<LightOptions>) => void
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
	const { options: givenOptions, children, onOptionsSet, ...attrs } = props
	const [ctx, actions] = useLights()
	const color = useMemo(() => shuffle(ctx.colors)[random(0, ctx.colors.length - 1)], [])
	const options = useMemo<RequireExactlyOne<Partial<LightOptions>, "color">>(
		() => ({
			color,
			...givenOptions,
		}),
		[givenOptions]
	)
	const [id, setId] = useState("")
	const light = useMemo(() => ctx.lights[id], [ctx.lights, id])
	useEffect(() => {
		if (!options) {
			return
		}
		const { x, y } = getCenter(div.current)
		const given = actions.createLight(options, [x, y])
		setId(given)
		return () => actions.removeLight(given)
	}, [])
	const [optionsEventSent, setOptionsEventSent] = useState(false)
	useEffect(() => {
		if (!light) {
			return
		}
		if (optionsEventSent) {
			return
		}
		setOptionsEventSent(true)
		onOptionsSet?.(light)
	}, [light])
	useEffect(() => {
		if (!light) {
			return
		}
		const { x, y } = getCenter(div.current)
		actions.updateLightPosition(id, [x, y])
	}, [ctx.windowSize, ctx.windowScroll])
	useEffect(() => {
		if (!light) {
			return
		}
		actions.updateLightOptions(id, options)
	}, [options])
	const div = useRef<HTMLDivElement>(null)
	return (
		<div {...attrs} ref={div}>
			{children}
		</div>
	)
}

const delays: { [prop: string]: Pt } = {}
/**
 * Given a `Pt`, delay its movement over time.
 * [This example is a useful reference](https://ptsjs.org/demo/edit/?name=create.gridcells).
 */
function delayPt(given: Pt, delay: number, prop: string | (string | number)[]) {
	const accessor = Array.isArray(prop) ? prop.join("-") : prop
	const givenDelayed = delays[accessor]
	const delaySet = typeof givenDelayed !== "undefined" && givenDelayed !== given
	let newVal: Pt
	if (delaySet) {
		const velocity = given.$subtract(givenDelayed).$divide(delay)
		// delays[accessor] = givenDelayed.$add(velocity)
		newVal = givenDelayed.$add(velocity)
	} else {
		// delays[accessor] = given
		newVal = given
	}
	delays[accessor] = newVal
	return newVal
}
/** Same as`delayPt()` but for numbers */
function delayNumber(given: number, delay: number, prop: string | (string | number)[]) {
	return delayPt(new Pt([given]), delay, prop)[0]
}

interface LightCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
	background?: string
	onFirstFrame?: () => void
}
/** Canvas where lights are drawn */
function LightsCanvas(props: LightCanvasProps) {
	const { background, onFirstFrame, ...attrs } = props
	const [ctx] = useLights()
	const lightEntries = useMemo(() => Object.entries(ctx.lights), [ctx.lights])
	function onAnimate(space: CanvasSpace, form: CanvasForm) {
		if (!space || !form) {
			return
		}
		form.composite("screen")
		for (const [index, light] of lightEntries) {
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
	}
	return (
		<div {...attrs}>
			<PtsCanvas
				background={background}
				onAnimate={onAnimate}
				resize
				onStart={onFirstFrame}
				play
				style={{ position: "absolute", inset: 0 }}
			/>
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
