import { CanvasSpace, Circle, Pt, GroupLike, PtsCanvasRenderingContext2D, Const } from "pts"
import { createContext, useContext, useEffect, useRef } from "react"
import { useMount, useUnmount } from "react-use"
import { lighten, transparentize } from "color2k"
import { easeIn, easeOut } from "popmotion"
import { throttle, clamp, random, shuffle } from "lodash-es"

export function Lights() {
	return <div>Hi</div>
}

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
	return useContext(LightsContext)
}
const defaultColors = ["#f0A3FF", "#6D53FF", "#1D0049", "#0069BA", "#5BB8FF"]
const defaultBackground = "#2D0D60"

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
