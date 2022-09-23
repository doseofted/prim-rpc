import { Component, createEffect, createMemo, mergeProps } from "solid-js"
import { styled } from "solid-styled-components"
import { lighten, toRgba, transparentize } from "color2k"
import { easeIn, easeOut } from "popmotion"

const limitRange = (given: number, min: number, max: number) => Math.min(Math.max(given, min), max)

interface Props {
	/** Size of the given light (light will appear smaller if `.brightness` is low) */
	size?: string | number
	/**
	 * Color to use at 0.5 `.brightness` (transparent at 0, white at `.brightness` of 1)
	 */
	color?: string
	/**
	 * Brightness from 0-1
	 * @default 0.5
	 */
	brightness?: number,
	/** Absolute offset from the element's position */
	offset?: number | string
	/** Rotation given in degrees */
	rotation?: number
}
export const Light: Component<Props> = (given) => {
	const props = mergeProps({
		size: "300px",
		color: "#49EDFF",
		brightness: 0.5,
		offset: 0,
		rotation: 0,
	}, given)
	const useEasing = false
	const size = createMemo(() => typeof props.size === "number" ? `${props.size}px` : props.size)
	const opacity = createMemo(() => {
		const limited = limitRange(props.brightness, 0, 0.5)
		const given = 1 - limited * 2
		const easing = useEasing ? (1 - easeIn(limited * 2)) : 1
		const eased = given * easing
		return eased
	})
	const lightness = createMemo(() => {
		const limited = limitRange(props.brightness, 0.5, 1)
		const given = limited - 0.5
		const easing = useEasing ? (1 - easeOut(limited * 2)) : 1
		const eased = given * easing
		return eased
	})
	const color = createMemo(() => toRgba(props.color))
	const offset = createMemo(() => typeof props.offset === "number" ? `${props.offset}px` : props.offset)
	const rotation = createMemo(() => `${props.rotation ?? 0}deg`)
	createEffect(() => {
		console.log(props.brightness)
	})
	const Container = styled.div<{
		size: string,
		color: string,
		lightness: number,
		opacity: number,
		brightness: number
		offset?: string
		rotation?: string
	}>`
		--size: ${p => p.size};
		--color: ${p => transparentize(lighten(p.color, p.lightness), p.opacity)};
		--innerStrength: ${p => p.brightness * 0.25 * 100}%;
		--outerStrength: ${p => 90 + p.brightness * 10}%;
		background-image: radial-gradient(closest-side, var(--color) var(--innerStrength), transparent var(--outerStrength));
		width: var(--size);
		height: var(--size);
		transform-origin: center;
		transform: rotateZ(${p => p.rotation}) translateX(${p => p.offset});
		mix-blend-mode: screen;
		position: absolute;
	`
	return (
		<Container
			size={size()}
			brightness={props.brightness}
			color={color()}
			lightness={lightness()}
			opacity={opacity()}
			offset={offset()}
			rotation={rotation()}
		/>
	)
}
