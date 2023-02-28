/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { random } from "lodash-es"
import { useEffect, useMemo, useState } from "react"
import { useToggle } from "react-use"
import { Light, LightOptions } from "@/components/Lights"

type PossibleStates = "enter" | "exit"
interface LightStateProps extends React.HTMLAttributes<HTMLDivElement> {
	state?: PossibleStates
	options?: Partial<LightOptions>
	children?: React.ReactNode | React.ReactNode[]
}
/**
 * A wrapper around `Light` with pre-configured states for page actions.
 */
export function LightState(props: LightStateProps) {
	const { children, options: optionsGiven = {}, state = "enter", ...attrs } = props
	const [configured, setConfigured] = useState<Partial<LightOptions>>({})
	type TimelineItem = [timestamp: number, options: Partial<LightOptions>][]
	const timelines = useMemo<{ [key in PossibleStates]: TimelineItem }>(() => {
		const enterDelay = random(50, 75)
		const enter: TimelineItem = [
			[
				0,
				{
					...configured,
					brightness: 0,
					size: (configured.size ?? 0) * 3,
					offset: [random(100, 200), random(100, 200)],
					rotate: random(0, 360),
					delay: enterDelay,
				},
			],
			[
				random(200, 1000),
				{
					...configured,
					delay: enterDelay,
				},
			],
		]
		const exitDelay = random(25, 75)
		const exit: TimelineItem = [
			[
				0,
				{
					...configured,
					delay: exitDelay,
				},
			],
			[
				random(200, 1000),
				{
					...configured,
					brightness: 0,
					size: (configured.size ?? 0) * 2,
					offset: [random(0, 100), random(0, 100)],
					rotate: random(0, 360),
					delay: exitDelay,
				},
			],
		]
		return {
			enter,
			exit,
		}
	}, [configured])
	const [options, setOptions] = useState(optionsGiven)
	const lightReady = useMemo(() => Object.keys(configured).length > 0, [configured])
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [jitter, setJitter] = useToggle(false)
	useEffect(() => {
		if (!lightReady) {
			return
		}
		const timeline = timelines[state]
		setJitter(false)
		const cancellations = timeline.map(([timestamp, newOptions], index) => {
			const lastTimelineItem = index === timeline.length - 1
			if (lastTimelineItem) {
				setTimeout(() => {
					setJitter(true)
				}, timestamp)
			}
			return setTimeout(() => {
				setOptions(newOptions)
			}, timestamp)
		})
		return () => {
			cancellations.map(cancelId => clearTimeout(cancelId))
		}
	}, [state, lightReady])
	// useInterval(() => console.log("jitter"), jitter ? 1000 : null)
	return (
		<Light {...attrs} options={options} onOptionsSet={opts => setConfigured(opts)}>
			{children}
		</Light>
	)
}

function randomNegative(given = 1) {
	return given * (random(false) === 0 ? -1 : 1)
}
function generateLightOptions(
	count = 12,
	sizeBase = 400,
	focus = 0,
	offset: [x: number, y: number] = [0, 0]
): Partial<LightOptions>[] {
	const focusStrength = 1 - focus
	return Array.from(Array(count), (_, i) => ({
		brightness: i % 3 === 0 ? random(1.1, 1.3) : random(0.7, 1.1),
		offset:
			i % 3 === 0
				? [
						offset[0] + random(75, 150) * randomNegative() * focusStrength,
						offset[1] + random(75, 150) * randomNegative() * focusStrength,
				  ]
				: [offset[0] + random(-50, 50) * focusStrength, offset[1] + random(-50, 50) * focusStrength],
		delay: random(40, 60),
		rotate: random(0, 360),
		size: i % 3 === 0 ? random(sizeBase, sizeBase * 0.25) : random(sizeBase / 2, sizeBase),
	}))
}

interface LightsStateProps extends LightStateProps {
	count?: number
	size?: number
	focus?: number
	offset?: [x: number, y: number]
	children?: React.ReactNode | React.ReactNode[]
	disableAnimation?: boolean
}
/**
 * A wrapper around `LightState` that is a wrapper around `Light`.
 * This is a very opinionated version of `LightState`.
 * This creates multiple lights at the same point along with an additional `<div />`
 * wrapper around given children to absolutely position lights at center of given element.
 */
export function OpinionatedLight(props: Omit<LightsStateProps, "options">) {
	const { count, size, focus, offset, disableAnimation = false, children, className, ...lightStateProps } = props
	const illuminated = useMemo<Partial<LightOptions>[]>(
		() => generateLightOptions(count, size, focus, offset),
		[count, size, focus, offset]
	)
	const LightChosen = disableAnimation ? Light : LightState
	return (
		<div className={["relative", className].join(" ")}>
			{illuminated.map((light, index) => (
				<LightChosen
					key={index}
					{...lightStateProps}
					options={light}
					className="absolute inset-0 pointer-events-none"
				/>
			))}
			{children}
		</div>
	)
}
