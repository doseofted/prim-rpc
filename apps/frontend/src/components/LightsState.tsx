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
 * A wrapper around Light with pre-configured states for page actions.
 */
export function LightState(props: LightStateProps) {
	const { children, options: optionsGiven = {}, state = "enter", ...attrs } = props
	type TimelineItem = [timestamp: number, options: Partial<LightOptions>][]
	const timelines = useMemo<{ [key in PossibleStates]: TimelineItem }>(() => {
		const delay = random(0, 50)
		const enter: TimelineItem = [
			[
				0,
				{
					...optionsGiven,
					brightness: 0,
					size: 0,
					offset: [random(50, 150), random(50, 150)],
					rotate: random(0, 360),
					delay,
				},
			],
			[
				random(500, 1500),
				{
					...optionsGiven,
					delay,
				},
			],
		]
		const exit: TimelineItem = [
			[
				0,
				{
					...optionsGiven,
					delay,
				},
			],
			[
				random(500, 1500),
				{
					...optionsGiven,
					brightness: 0,
					size: 0,
					offset: [random(50, 150), random(50, 150)],
					rotate: random(0, 360),
					delay,
				},
			],
		]
		return {
			enter,
			exit,
		}
	}, [optionsGiven])
	const [options, setOptions] = useState(optionsGiven)
	useEffect(() => {
		const timeline = timelines[state]
		console.log("timeline state", state)

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
	}, [state])
	return (
		<Light {...attrs} options={options}>
			{children}
		</Light>
	)
}
