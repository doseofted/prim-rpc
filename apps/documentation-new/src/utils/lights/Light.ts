import { animate, motionValue } from "framer-motion/dom"
import { type ValueAnimationTransition } from "framer-motion"
import { defu } from "defu"
import { createConsola } from "consola"

const console = createConsola({ level: 5 }).withTag("LightSet")

export interface LightProperties {
	/** Center point of light */
	center: [x: number, y: number]
	/** Offset of light given fom its center */
	offset: [x: number, y: number]
	/** Brightness from 0-2 */
	brightness: number
	/** Size of light itself, unrelated to brightness */
	size: number
	/** Color of the light when brightness is 1 */
	color: string
}

export enum LightState {
	// States to be set
	Activating = "activating",
	Deactivating = "inactivating",
	Destroying = "destroying",
	// Destination states
	Inactive = "inactive",
	Active = "active",
	Destroyed = "destroyed",
}

export type LightStatesSet = Exclude<LightState, LightState.Inactive | LightState.Active | LightState.Destroyed>

export class Light implements LightProperties {
	#targets: LightProperties
	get targets() {
		return this.#targets
	}
	updateTargets(props: Partial<LightProperties>) {
		Object.assign(this.targets, props)
	}

	#center
	get center() {
		return this.#center
	}
	set center(value) {
		this.#center = value
	}

	#motionProps: ValueAnimationTransition<number | string> = {
		type: "spring",
		damping: 50,
		mass: 20,
		stiffness: 50,
	}

	#x
	#y
	set offset([x, y]: [x: number, y: number]) {
		for (const [given, current] of [
			[x, this.#x],
			[y, this.#y],
		] as const) {
			const diff = given !== current.get()
			if (diff) {
				void animate(current, given, this.#motionProps)
			}
		}
	}
	get offset() {
		return [this.#x.get(), this.#y.get()]
	}

	#brightness
	set brightness(value: number) {
		// brightness partly determines state, if being destroyed then don't update
		if (this.beingDestroyed) return
		void animate(this.#brightness, value, this.#motionProps)
	}
	get brightness() {
		return this.#brightness.get()
	}

	#size
	set size(value) {
		void animate(this.#size, value, this.#motionProps)
	}
	get size() {
		return this.#size.get()
	}

	#color
	set color(value) {
		void animate(this.#color, value, this.#motionProps)
	}
	get color() {
		return this.#color.get()
	}

	destroy() {
		this.#brightness.destroy()
		this.#size.destroy()
		this.#color.destroy()
		this.#x.destroy()
		this.#y.destroy()
		this.#state = LightState.Destroyed
	}

	// state of light (to animate properties before adding/removing)
	#state
	public get state() {
		return this.#state
	}
	get beingDestroyed() {
		return [LightState.Destroying, LightState.Destroyed].includes(this.#state)
	}
	changeState(state: LightStatesSet) {
		if (this.beingDestroyed) return
		// this.#brightness.clearListeners() // interrupt previous transition
		switch (state) {
			case LightState.Deactivating: {
				this.brightness = 0
				this.#brightness.on("animationComplete", () => {
					if (this.#state !== LightState.Deactivating) return
					this.#state = LightState.Inactive
					this.#brightness.clearListeners()
					console.debug("updated light state:", this.#state)
				})
				break
			}
			case LightState.Activating: {
				this.brightness = this.targets.brightness
				this.#brightness.on("animationComplete", () => {
					if (this.#state !== LightState.Activating) return
					this.#state = LightState.Active
					this.#brightness.clearListeners()
					console.debug("updated light state:", this.#state)
				})
				break
			}
			case LightState.Destroying: {
				// brightness can only be updated when not destroyed, so update first
				this.brightness = 0
				this.#brightness.on("animationComplete", () => {
					if (this.#state !== LightState.Destroying) return
					this.#state = LightState.Destroyed
					this.#brightness.clearListeners()
					console.debug("updated light state:", this.#state)
				})
				break
			}
			default:
				break
		}
		this.#state = state
		console.debug("light state:", this.#state)
	}

	#id: symbol
	get id() {
		return this.#id
	}

	constructor(targets: Partial<LightProperties> = {}, activate = true) {
		this.#id = Symbol("light")
		this.#targets = defu<LightProperties, LightProperties[]>(targets, {
			center: [0, 0],
			offset: [0, 0],
			brightness: 1,
			size: 100,
			color: "#ffffff",
		})
		// set intended values of properties on creation
		const [x, y] = this.#targets.offset
		this.#center = this.targets.center
		this.#x = motionValue(x)
		this.#y = motionValue(y)
		this.#size = motionValue(this.targets.size)
		this.#color = motionValue(this.targets.color)
		// brightness will be animated to target value on state change
		this.#brightness = motionValue(0)
		this.brightness = this.targets.brightness
		this.#state = LightState.Inactive
		if (activate) {
			this.changeState(LightState.Activating)
		}
	}
}
