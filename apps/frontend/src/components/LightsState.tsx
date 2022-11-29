import { random } from "lodash-es"
import { useEffect, useMemo, useState } from "react"
import { Light, LightOptions } from "./Lights"

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
		const exitDelay = random(75, 150)
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
					size: 0,
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
	}, [optionsGiven])
	const [options, setOptions] = useState(optionsGiven)
	const lightReady = useMemo(() => Object.keys(configured).length > 0, [configured])
	useEffect(() => {
		if (!lightReady) {
			return
		}
		const timeline = timelines[state]
		const cancellations = timeline.map(([timestamp, newOptions], index) => {
			const lastTimelineItem = index === timeline.length - 1
			if (lastTimelineItem) {
				setTimeout(() => {
					console.log("todo: start jitter effect")
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
	return (
		<Light {...attrs} options={options} onOptionsSet={opts => setConfigured(opts)}>
			{children}
		</Light>
	)
}
