import { Component, createMemo, mergeProps, For } from "solid-js"
import { styled } from "solid-styled-components"
import { easeIn, easeOut } from "popmotion"
import { Light } from "./Light"

interface Props {
	/** Number of lights that should appear */
	lightCount?: number
	/** Amount of turbulence from 0 (none) to 1 (crazy) */
	turbulence?: number
	/** Whether points should be at center (0) or at farthest point (1) */
}
/**
 * A group of [Lights](./Light.tsx) that revolve around a single point.
 */
export const LightGroup: Component<Props> = (given) => {
	const props = mergeProps({
		lightCount: 5,
		turbulence: 0.5,
	}, given)
	const lights = createMemo(() => Array.from({ length: props.lightCount }, (_given, i) => i))
	return (
		<For each={lights()}>{() => <>
			<Light />
		</>}</For>
	)
}
