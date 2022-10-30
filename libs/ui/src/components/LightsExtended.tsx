import { random } from "lodash-es"
import {
	Component, JSX, splitProps, createMemo, createEffect, mergeProps, onMount, createSignal,
} from "solid-js"
import { Light, LightOptions } from "./Lights"

// SECTION Light with behaviors
interface LightBehaviorProps extends JSX.HTMLAttributes<HTMLDivElement> {
	/** Focus determines the `offset` from center while `rotate` is chosen as random (0 is centered, 1 if out-of-focus) */
	focus?: number
	/** Strength determines the `brightness` and `size` (0-1) */
	strength?: number
	// NOTE: jitter will be multiplied by strength and focus
	/** Jitter adjusts `offset` and `brightness` over time from 0 (weak/none) to 1 (strong) */
	jitter?: number
	/** A limited selection of options passed directly to the Light component */
	options?: Pick<LightOptions, "color">
	/** Define limits for behaviors (leave empty for defaults) */
	limits?: {
		/** Maximum focus as a pixel amount (unit not needed) */
		focus: number
		/** Define a strength limit (size limit, as pixels) */
		strength: number
		/** Define a jitter amount in pixels */
		jitter: number
	}
}
/**
 * This is a variant of the `Light` component but its props describe behavior
 * rather than its attributes. For instance, instead of controlling brightness,
 * size, position, and rotation individually, change `focus` to control all of them. 
 */
export const LightAuto: Component<LightBehaviorProps> = (p) => {
	const pDefaults = mergeProps<LightBehaviorProps[]>({
		// factors:
		focus: 1, strength: 0.5, jitter: 0.3,
		limits: {
			focus: 250, strength: 500, jitter: 50,
		},
	}, p)
	const [props, lightRelated] = splitProps(pDefaults, ["focus", "strength", "jitter", "limits", "options"])
	const focusValues = createMemo<Pick<LightOptions, "offset" | "rotate"> | undefined>(() => {
		const limit = props.limits?.focus
		if (typeof limit === "undefined" || typeof props.focus === "undefined") { return }
		const focus = props.focus * limit
		return {
			offset: [random(0, focus), random(0, focus)],
			rotate: random(0, 360),
		}
	})
	const strengthValues = createMemo<Pick<LightOptions, "brightness" | "size"> | undefined>(() => {
		const limit = props.limits?.strength
		if (typeof limit === "undefined" || typeof props.strength === "undefined") { return }
		return {
			brightness: props.strength * 2,
			size: props.strength * limit,
		}
	})
	const options = createMemo<Partial<LightOptions>>(() => {
		const opts: Partial<LightOptions> = {
			...focusValues(),
			...strengthValues(),
		}
		for (const [key] of Object.keys(opts)) {
			if (typeof opts[key as keyof LightOptions] === "undefined") { delete opts[key as keyof LightOptions] }
		}
		return opts
	})
	createEffect(() => {
		console.log(options(), focusValues())
	})
	const timeline: [ts: number, opts: () => Partial<LightOptions>][] = [
		// eslint-disable-next-line solid/reactivity
		[0, () => ({ brightness: 0, offset: [0, 0], rotate: 0, size: strengthValues()?.size })],
		// eslint-disable-next-line solid/reactivity
		[1000, () => options()],
	]
	// eslint-disable-next-line solid/reactivity
	const [currentOptions, setCurrentOptions] = createSignal(options())
	onMount(() => {
		for (const [ts, opts] of timeline) {
			setTimeout(() => {
				setCurrentOptions(opts())
			}, ts)
		}
	})
	return <Light {...lightRelated} options={currentOptions()} />
}
// !SECTION
