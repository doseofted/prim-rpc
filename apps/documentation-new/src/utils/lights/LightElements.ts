import { Light, LightState } from "./Light"
import { ElementSet } from "./ElementSet"
import { createConsola } from "consola"

const console = createConsola({ level: 5 }).withTag("LightEvents")

/**
 * Manages all lights on on a page, created by assigning `data-light` attributes to elements.
 * `LightElements` is initialized once for the entire page and changes to the page are monitored.
 * This class sets up light properties but must be displayed by a `LightCanvas` instance on the page.
 *
 * Place a light behind an element like so: `<div data-light="1" />`. This will create a single light
 * with given properties. If more than one light is given, additional lights will have variations
 * in offset, size, and brightness to create a colorful glow effect with given color choices.
 *
 * Properties available (only applies when `data-light` is set):
 *
 * - `data-light={number: >=0}` - number of lights to create at center of given element.
 * - `data-color={string: hex}` - color of light, can be any valid CSS color value
 * - `data-size={number: 0-100}` - size of light, unit-less but generally interpreted as percent of screen
 * - `data-brightness={number: 0-2}` - brightness of light: 0 is transparent, 1 utilizes given color, 2 is white
 */
export class LightElements {
	#elements = new ElementSet()

	scrollEvent() {
		console.debug("scroll update happened")
		this.#elements.applyUpdates()
	}
	#scrollListener: typeof this.scrollEvent

	resizeEvent() {
		console.debug("resize update happened")
		this.#elements.applyUpdates()
	}
	#resizeListener: typeof this.resizeEvent

	destroy() {
		this.#mutationObserver.disconnect()
		document.removeEventListener("scroll", this.#scrollListener)
		document.removeEventListener("resize", this.#resizeListener)
		this.#elements.destroy()
		console.debug("LightEvents instance was destroyed")
	}

	#mutationObserver: MutationObserver

	#lights = new Map<HTMLElement, Light[]>()

	#listNeedsUpdate = false
	#listCached: Light[] = []
	get all() {
		if (this.#listNeedsUpdate) {
			console.debug("Creating list of all lights")
			this.#listCached = Array.from(this.#lights.values()).flat()
			this.#listNeedsUpdate = false
		}
		// console.debug("Returning previous list of all lights")
		return this.#listCached
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
			const { left, width, top, height } = element.getBoundingClientRect()
			const center = [left + width / 2, top + height / 2] as [number, number]
			const removeAllLights = !document.contains(element)
			if (lights && Array.isArray(lights)) {
				const newCount = count - lights.length
				if (count > lights.length) {
					const newLights = Array.from(Array(newCount)).map(() => new Light({ center }))
					lights.push(...newLights)
					console.debug("adding lights", newCount, newLights)
					this.#listNeedsUpdate = true
				} else if (count < lights.length) {
					const removed = Math.abs(newCount)
					console.debug("marking lights for removal", removed)
					// NOTE: lights are not removed immediately, but instead are marked for removal
					for (const index of Array.from(Array(removed).keys())) {
						lights[index].changeState(LightState.Destroying)
					}
				} else if (removeAllLights) {
					console.debug("marking all lights for removal", lights.length)
					for (const light of lights) {
						light.changeState(LightState.Destroying)
					}
					this.#elements.delete(element)
					this.#lights.delete(element)
				}
				// clean up of destroyed lights only happens on next update (ready for removal)
				const readyToBeRemoved = lights
					.map((light, index) => (light.state === LightState.Destroyed ? index : -1))
					.filter(index => index !== -1)
					.reverse()
				for (const removeIndex of readyToBeRemoved) {
					lights[removeIndex]?.destroy()
					lights.splice(removeIndex, 1)
				}
				if (readyToBeRemoved.length > 0) {
					console.debug("lights removed", readyToBeRemoved.length)
					this.#listNeedsUpdate = true
				}
				for (const light of lights) {
					light.center = center
					// TODO: other properties
				}
				continue
			}
			this.#lights.set(
				element,
				Array.from(Array(count)).map(() => new Light({ center }))
			)
			this.#listNeedsUpdate = true
			console.debug("initializing lights for element", count)
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

		const addPossibleElements = () => {
			const lightElements = document.querySelectorAll("[data-light]")
			for (const lightElem of lightElements) {
				this.#elements.add(lightElem as HTMLElement)
			}
			if (lightElements.length === 0) {
				// update is needed to remove any previous elements
				this.elementUpdates()
			}
			return lightElements.length
		}

		document.addEventListener(
			"astro:page-load",
			() => {
				const elementCount = addPossibleElements()
				console.debug("page loaded, elements found:", elementCount)
			},
			{ once: true }
		)
		// find elements on page load
		document.addEventListener("astro:after-swap", () => {
			const elementCount = addPossibleElements()
			console.debug("page update happened, elements found:", elementCount)
		})

		/** Determine if given `<div />` has "light" properties */
		function isElementWithLight(node: Node): HTMLElement | false {
			const elem = node.nodeType === 1 ? (node as HTMLElement) : null
			return elem && elem.hasAttribute("data-light") ? elem : false
		}

		// detect changes to the document
		this.#mutationObserver = new MutationObserver(mutations => {
			console.debug("document mutation happened", mutations)
			for (const mutation of mutations) {
				if (mutation.type !== "childList") continue
				for (const node of mutation.addedNodes) {
					const light = isElementWithLight(node)
					if (!light) continue
					this.#elements.add(light)
					console.debug("added new element light", node)
				}
				for (const node of mutation.removedNodes) {
					const light = isElementWithLight(node)
					if (!light) continue
					this.#elements.delete(light)
					console.debug("removed old element light", node)
				}
			}
		})
		this.#mutationObserver.observe(document.body, { childList: true, subtree: true })
	}
}
