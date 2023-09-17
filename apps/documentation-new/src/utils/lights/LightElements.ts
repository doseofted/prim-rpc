import { createConsola } from "consola"
import { clamp } from "framer-motion/dom"
import { ElementSet } from "./ElementSet"
import { Light } from "./Light"
import { LightGroup } from "./LightGroup"

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
 * - `data-light={>=0}` - number of lights to create at center of given element
 * - `data-colors={#123456}` - possible colors of light(s), comma separated list of color values (hexadecimal)
 * - `data-size={0,100}` - min/max size of light, unit-less but generally interpreted as percent of screen (0-100)
 * - `data-offset={100}` - max offset radius of light from center of element
 * - `data-brightness={0-2,0-2}` - min/max brightness of light: 0 is transparent, 1 utilizes given color, 2 is white
 */
export class LightElements {
	#elements = new ElementSet(["data-light", "data-colors", "data-size", "data-offset", "brightness"])

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

	#lights = new Map<HTMLElement, LightGroup>()

	#listNeedsUpdate = false
	#listCached: Light[] = []
	get all() {
		if (this.#listNeedsUpdate) {
			this.#listCached = Array.from(this.#lights.values()).flatMap(({ lights }) => lights)
			console.debug("Caching list of all lights", this.#listCached.length)
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

	utils = {
		parseCommaDelimited<T = string>(str: string | undefined, mapFn: (str: string) => T = s => s as unknown as T) {
			return typeof str === "string" ? str.split(",").map(mapFn) : str
		},
	}

	#getElementProperties(element: HTMLElement) {
		const count = element.dataset.light ? clamp(0, Infinity, parseInt(element.dataset.light)) : undefined
		const colors = this.utils.parseCommaDelimited(element.dataset.color)
		const possibleSize = element.dataset.size ? element.dataset.size.split(",").map(parseFloat) : undefined
		const size = possibleSize?.length === 2 ? (possibleSize as [number, number]) : undefined
		const offset = element.dataset.offset ? parseInt(element.dataset.offset) : undefined
		const possibleBrightness = element.dataset.brightness
			? element.dataset.brightness.split(",").map(b => clamp(0, 2, parseFloat(b)))
			: undefined
		const brightness = possibleBrightness?.length === 2 ? (possibleBrightness as [number, number]) : undefined
		const options = { count, colors, size, offset, brightness }
		for (const [key, val] of Object.entries(options)) {
			if (typeof val === "undefined" || val === null) {
				delete options[key as keyof typeof options]
			}
		}
		console.debug("element options", options)
		return options
	}

	elementUpdates() {
		console.debug("element was updated, running updates", this.#elements.size)
		for (const element of this.#elements) {
			const elementOptions = this.#getElementProperties(element)
			const { count = 0 } = elementOptions
			const lights = this.#lights.get(element)
			const { left, width, top, height } = element.getBoundingClientRect()
			const center = [left + width / 2, top + height / 2] as [number, number]
			const removeAllLights = !document.contains(element)
			if (lights) {
				lights.updateRanges(elementOptions)
				const countChanged = lights.setLightCount(count, { center }, removeAllLights)
				this.#listNeedsUpdate = countChanged
				if (removeAllLights) {
					void lights.destroy()
					this.#lights.delete(element)
					this.#elements.delete(element)
				}
				continue
			}
			const newLightGroup = new LightGroup(elementOptions)
			this.#lights.set(element, newLightGroup)
			this.#listNeedsUpdate = true
			console.debug("initializing new lights for element", newLightGroup.lights.length)
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

		const addPossibleElements = (parent: HTMLElement | Document = document) => {
			const lightElements = parent.querySelectorAll("[data-light]")
			for (const lightElem of lightElements) {
				this.#elements.add(lightElem as HTMLElement)
			}
			this.elementUpdates()
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
			const isLightDirect = elem && elem.hasAttribute("data-light") ? elem : false
			// it's possible that element mutated was not a light but children might be
			if (!isLightDirect && elem) {
				addPossibleElements(elem)
			}
			return isLightDirect
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
