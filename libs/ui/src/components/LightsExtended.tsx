import { random } from "lodash-es"
import {
	Component, JSX, splitProps, createMemo, createEffect, mergeProps, createSignal, onCleanup,
} from "solid-js"
import { Light, LightOptions, useLights } from "./Lights"

// SECTION Light with behaviors
interface LightBehaviorProps extends JSX.HTMLAttributes<HTMLDivElement> {
	/** Focus determines the `offset` from center while `rotate` is chosen as random (0 is centered, 1 if out-of-focus) */
	focus?: number
	/** Strength determines the `brightness` and `size` (0-1) */
	strength?: number
	// NOTE: jitter will be multiplied by strength and focus
	/** Jitter adjusts `offset` and `brightness` over time from 0 (weak/none) to 1 (strong) */
	jitter?: number
	/** Define limits for behaviors (leave empty for defaults) */
	limits?: {
		/** Maximum focus as a pixel amount (unit not needed) */
		focus: number
		/** Define a strength limit (size limit, as pixels) */
		strength: number
		/** Define a jitter amount in pixels */
		jitter: number
	}
	/** A limited selection of options passed directly to the Light component */
	options?: Pick<LightOptions, "color">
}
/**
 * This is a variant of the `Light` component but its props describe behavior
 * rather than its attributes. For instance, instead of controlling brightness,
 * size, position, and rotation individually, change `focus` to control all of them. 
 */
export const LightAuto: Component<LightBehaviorProps> = (p) => {
	const pDefaults = mergeProps({
		// factors:
		focus: 1, strength: 0.5, jitter: 1,
		limits: {
			focus: 500, strength: 500, jitter: 50,
		},
	}, p)
	const [props, lightRelated] = splitProps(pDefaults, ["focus", "strength", "jitter", "limits", "options"])
	const limit = (prop: keyof typeof props["limits"], val: number) => val * props.limits[prop]
	const timeline = createMemo(() => {
		const rotate = random(0, 360)
		const time: [ts: number, opts: Partial<LightOptions>][] = [
			[0, {
				brightness: 0,
				offset: [0, 0],
				rotate: 0,
			}],
			[500, {
				brightness: 1.5,
				offset: [random(limit("focus", props.focus) * -1), random(limit("focus", props.focus))],
				rotate,
			}],
			[1000, { rotate, offset: [0, 0] }],
		]
		return time
	})
	const ctx = useLights()
	// eslint-disable-next-line solid/components-return-once
	if (!ctx) { return <></> }
	const [, env] = ctx
	const [current, setCurrent] = createSignal<Partial<LightOptions>>({})
	createEffect(() => {
		if (!env.playing) { return }
		const duration = timeline().map(([ts]) => ts).reduce((a, b) => a > b ? a : b)
		// play timeline
		for (const [ts, opts] of timeline()) {
			setTimeout(() => { setCurrent(opts) }, ts)
		}
		// start jitter effect
		let interval: number | undefined
		setTimeout(() => {
			interval = window.setInterval(() => {
				setTimeout(() => {
					setCurrent({
						offset: [random(0, limit("jitter", props.jitter)), random(0, limit("jitter", props.jitter))],
						rotate: random(0, 360),
						delay: 100,
					})
				}, random(0, 500))
			}, 500)
		}, duration + 500)
		onCleanup(() => {
			window.clearInterval(interval)
		})
	})
	return <Light {...lightRelated} options={{ ...props.options, ...current() }} />
}
// !SECTION
