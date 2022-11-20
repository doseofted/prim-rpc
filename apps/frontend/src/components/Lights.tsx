import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useImmer } from "use-immer"
import { nanoid } from "nanoid"
import { useWindowScroll, useWindowSize } from "react-use"
import { random, shuffle } from "lodash-es"

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
	createLight(opts: LightOptions, position: [x: number, y: number]): string
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

const defaultColors = ["#f0A3FF", "#6D53FF", "#1D0049", "#0069BA", "#5BB8FF"]
const defaultBackground = "#2D0D60"

export interface LightsProps {
	children?: React.ReactNode | React.ReactNode[]
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
/** Provider for `Light` components */
export function Lights(props: LightsProps) {
	const { children, colors: colorsGiven, options: optionsShared } = props
	const [lights, setLights] = useImmer<{ [id: string]: LightInstance }>({})
	const windowSize = useWindowSize(0, 0)
	const windowScroll = useWindowScroll()
	const colors = useMemo(() => colorsGiven ?? defaultColors, [colorsGiven])
	const ctx = useMemo<LightsContext>(
		() => [
			{ lights, windowSize, windowScroll, colors },
			{
				createLight(opts, position) {
					const id = nanoid()
					setLights(draft => {
						const [x, y] = position ?? [0, 0]
						draft[id] = {
							...optionsShared,
							...opts,
							position: [x, y],
							id,
						}
					})
					return id
				},
				updateLightOptions(id, options) {
					setLights(draft => {
						const light = draft[id]
						draft[id] = { ...optionsShared, ...light, ...options }
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
		[lights, windowSize, windowScroll]
	)
	return <LightsContext.Provider value={ctx}>{children}</LightsContext.Provider>
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
export function Light(props: LightsProps) {
	const { options: givenOptions, children, ...attrs } = props
	const [ctx, actions] = useLights()
	const color = useMemo(() => shuffle(ctx.colors)[random(0, ctx.colors.length - 1)], [])
	const options = useMemo<LightOptions>(
		() => ({
			color,
			size: 50,
			offset: [0, 0],
			delay: 50,
			brightness: 1,
			...givenOptions,
		}),
		[givenOptions]
	)
	const [id, setId] = useState("")
	// const light = useMemo(() => ctx.lights[id], [ctx.lights, id])
	useEffect(() => {
		if (!options) {
			return
		}
		const { x, y } = getCenter(div.current)
		const given = actions.createLight(options, [x, y])
		setId(given)
		return () => actions.removeLight(given)
	}, [])
	useEffect(() => {
		if (!id) {
			return
		}
		const { x, y } = getCenter(div.current)
		actions.updateLightPosition(id, [x, y])
	}, [ctx.windowSize, ctx.windowScroll])
	useEffect(() => {
		actions.updateLightOptions(id, options)
	}, [options])
	const div = useRef<HTMLDivElement>(null)
	return (
		<div {...attrs} ref={div}>
			{children}
		</div>
	)
}
