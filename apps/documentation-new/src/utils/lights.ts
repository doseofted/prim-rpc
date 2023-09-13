import mitt from "mitt"
// import type { AnimationPlaybackControls } from "framer-motion"
import { animate, motionValue } from "framer-motion/dom"
import { type ValueAnimationTransition } from "framer-motion"
import { defu } from "defu"

// possible spring animation
// const target = motionValue(0)
// void animate(target, 100, { type: "spring" })
// setTimeout(() => animate(target, -100, { type: "spring" }), 1000)
// target.on("change", console.log)

class LightSet extends Set<HTMLElement> {
	constructor() {
		super()
	}

	#events = mitt<{ update: undefined }>()

	onUpdates(cb?: () => void) {
		if (!cb) {
			return
		}
		return this.#events.on("update", cb)
	}

	applyUpdates() {
		this.#events.emit("update")
	}

	destroy() {
		this.clear()
		this.#events.all.clear()
	}

	#mapped = new Map<HTMLElement, MutationObserver>()

	#addListeners(elem: HTMLElement) {
		// track light-related properties
		const mutations = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				if (mutation.type !== "attributes") continue
				const target = mutation.target.nodeType === 1 ? (mutation.target as HTMLElement) : null
				if (!mutation.attributeName || !target) continue
				const newValue = target.getAttribute(mutation.attributeName)
				console.debug("attribute updated", newValue)
				this.applyUpdates()
			}
		})
		mutations.observe(elem, { attributes: true, attributeFilter: ["data-light"] })
		this.#mapped.set(elem, mutations)
		// track element position
	}

	#removeListeners(elem: HTMLElement) {
		this.#mapped.get(elem)?.disconnect()
		this.#mapped.delete(elem)
	}

	add(elem: HTMLElement) {
		const size = this.size
		super.add(elem)
		if (this.size > size) {
			this.#addListeners(elem)
			this.applyUpdates()
		}
		return this
	}

	delete(elem: HTMLElement) {
		const size = this.size
		const deleted = super.delete(elem)
		if (this.size < size) {
			this.#removeListeners(elem)
			this.applyUpdates()
		}
		return deleted
	}

	clear() {
		super.clear()
		for (const elem of this) {
			this.#removeListeners(elem)
		}
		this.applyUpdates()
	}
}

interface LightProperties {
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
enum LightState {
	// States to be set
	Activating = "activating",
	Deactivating = "inactivating",
	Destroying = "destroying",
	// Destination states
	Inactive = "inactive",
	Active = "active",
	Destroyed = "destroyed",
}
type LightStatesSet = Exclude<LightState, LightState.Inactive | LightState.Active | LightState.Destroyed>
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

	#x
	// #xAnim: AnimationPlaybackControls | undefined
	#y
	// #yAnim: AnimationPlaybackControls | undefined
	set offset([x, y]: [x: number, y: number]) {
		for (const [given, current] of [
			[x, this.#x],
			[y, this.#y],
		] as const) {
			const diff = given !== current.get()
			if (diff) {
				void animate(current, given, { type: "spring" })
			}
		}
		// if (this.#x.get() !== value[0] && (this.#xAnim?.complete ?? true)) {
		// 	console.log("xa", value[0])
		// 	this.#xAnim = animate(this.#x, value[0], { type: "spring" })
		// } else {
		// 	console.log("xd", value[0])
		// 	this.#xAnim?.stop()
		// 	this.#x.set(value[0])
		// }
		// if (this.#y.get() !== value[1] && (this.#yAnim?.complete ?? true)) {
		// 	console.log("ya", value[1])
		// 	this.#yAnim = animate(this.#y, value[1], { type: "spring" })
		// } else {
		// 	console.log("yd", value[1])
		// 	this.#yAnim?.stop()
		// 	this.#y.set(value[1])
		// }
		// console.log("---")
	}
	get offset() {
		return [this.center[0] + this.#x.get(), this.center[1] + this.#y.get()]
	}

	#motionProps: ValueAnimationTransition<number | string> = {
		type: "spring",
		// stiffness: 150,
		// damping: 50,
		// mass: 10,
	}

	#brightness
	set brightness(value: number) {
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
		this.#state = LightState.Destroyed
	}

	// state of light (to animate properties before adding/removing)
	#state
	public get state() {
		return this.#state
	}
	changeState(state: LightStatesSet) {
		if (this.#state === LightState.Destroyed) return
		this.#state = state
		switch (this.#state) {
			case LightState.Deactivating: {
				this.brightness = 0
				this.#brightness.on("animationComplete", () => {
					this.#state = LightState.Inactive
					this.#brightness.clearListeners()
				})
			}
			// eslint-disable-next-line no-fallthrough
			case LightState.Activating: {
				this.brightness = this.targets.brightness
				this.#brightness.on("animationComplete", () => {
					this.#state = LightState.Active
					this.#brightness.clearListeners()
				})
				break
			}
			// eslint-disable-next-line no-fallthrough
			case LightState.Destroying: {
				this.brightness = 0
				this.#brightness.on("animationComplete", () => {
					this.#state = LightState.Destroyed
					this.#brightness.clearListeners()
				})
				break
			}
			default:
				break
		}
	}

	constructor(targets: Partial<LightProperties> = {}) {
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
		this.changeState(LightState.Activating)
	}
}

export class LightEvents {
	#elements = new LightSet()

	scrollEvent() {
		console.debug("scroll")
		this.#elements.applyUpdates()
	}
	#scrollListener: typeof this.scrollEvent

	resizeEvent() {
		console.debug("resize")
		this.#elements.applyUpdates()
	}
	#resizeListener: typeof this.resizeEvent

	destroy() {
		this.#mutationObserver.disconnect()
		document.removeEventListener("scroll", this.#scrollListener)
		document.removeEventListener("resize", this.#resizeListener)
		this.#elements.destroy()
	}

	#mutationObserver: MutationObserver

	#lights = new Map<HTMLElement, Light[]>()

	#lightsArrayNeedsUpdate = false
	#lightsArrayCache: Light[] = []
	get all() {
		if (this.#lightsArrayNeedsUpdate) {
			this.#lightsArrayCache = Array.from(this.#lights.values()).flat()
			this.#lightsArrayNeedsUpdate = false
		}
		return this.#lightsArrayCache
	}
	[Symbol.iterator]() {
		let index = -1
		const next = () => ({ value: this.all[++index], done: !(index in this.all) })
		return { next }
	}
	get length() {
		return this.all.length
	}

	elementUpdates() {
		for (const element of this.#elements) {
			const count = element.dataset.light ? parseInt(element.dataset.light, 10) : 0
			const lights = this.#lights.get(element)
			if (lights && Array.isArray(lights)) {
				const newCount = count - lights.length
				if (count > lights.length) {
					lights.push(...Array.from(Array(newCount)).map(() => new Light()))
					this.#lightsArrayNeedsUpdate = true
				} else if (count < lights.length) {
					const removed = Math.abs(newCount)
					// NOTE: lights are not removed immediately, but instead are marked for removal
					for (const index of Array.from(Array(removed).keys())) {
						lights[index].changeState(LightState.Destroying)
					}
				}
				// clean up of destroyed lights only happens on next update (ready for removal)
				const readyToBeRemoved = lights
					.map((light, index) => (light.state === LightState.Destroyed ? index : -1))
					.filter(index => index !== -1)
				for (const removeIndex of readyToBeRemoved) {
					lights[removeIndex].destroy()
					lights.splice(removeIndex, 1)
				}
				if (readyToBeRemoved.length > 0) {
					console.debug("elements will be removed", readyToBeRemoved.length)
					this.#lightsArrayNeedsUpdate = true
				}
				// now update lights based on elements
				const { left, width, top, height } = element.getBoundingClientRect()
				const center = [left + width / 2, top + height / 2] as [number, number]
				for (const light of lights) {
					light.center = center
					// light.position = [left + width / 2, top + height / 2]
					// TODO: other properties
				}
				// console.debug("updated lights for element", lights)
				continue
			}
			this.#lightsArrayNeedsUpdate = true
			this.#lights.set(
				element,
				Array.from(Array(count)).map(() => new Light())
			)
			console.debug("created lights for element", this.#lights.get(element))
		}
	}
	#elementUpdatesListener: typeof this.elementUpdates

	constructor() {
		this.#elementUpdatesListener = this.elementUpdates.bind(this)
		this.#elements.onUpdates(this.#elementUpdatesListener)
		this.#scrollListener = this.scrollEvent.bind(this)
		document.addEventListener("scroll", this.#scrollListener)
		this.#resizeListener = this.resizeEvent.bind(this)
		window.addEventListener("resize", this.#resizeListener)

		// find elements on page load
		document.addEventListener("astro:page-load", () => {
			const lightElems = document.querySelectorAll("[data-light]")
			for (const lightElem of lightElems) {
				this.#elements.add(lightElem as HTMLElement)
			}
		})

		/** Determine if given `<div />` has "light" properties */
		function isLight(node: Node): HTMLElement | false {
			const elem = node.nodeType === 1 ? (node as HTMLElement) : null
			return elem && elem.hasAttribute("data-light") ? elem : false
		}

		// detect changes to the document
		this.#mutationObserver = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				if (mutation.type !== "childList") continue
				for (const node of mutation.addedNodes) {
					console.debug("added", node)
					const light = isLight(node)
					if (!light) continue
					this.#elements.add(light)
				}
				for (const node of mutation.removedNodes) {
					console.debug("removed", node)
					const light = isLight(node)
					if (!light) continue
					this.#elements.delete(light)
				}
			}
			console.debug(this.#elements)
		})
		this.#mutationObserver.observe(document.body, { childList: true, subtree: true })
	}
}
