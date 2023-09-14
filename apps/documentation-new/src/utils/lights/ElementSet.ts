import mitt from "mitt"
import { createConsola } from "consola"

const console = createConsola({ level: 5 }).withTag("ElementSet")

export class ElementSet extends Set<HTMLElement> {
	constructor() {
		super()
	}

	#events = mitt<{ update: undefined }>()

	onUpdates(cb?: () => void) {
		console.debug("onUpdates() called, active listeners:", this.#events.all.size)
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
				console.debug("attribute updated", mutation.attributeName, newValue)
				this.applyUpdates()
			}
		})
		mutations.observe(elem, {
			attributes: true,
			attributeFilter: ["data-light", "data-brightness", "data-color", "data-size"],
		})
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
			console.debug("Element added to ElementSet", this.size)
			this.applyUpdates()
		}
		return this
	}

	delete(elem: HTMLElement) {
		const size = this.size
		const deleted = super.delete(elem)
		if (this.size < size) {
			this.#removeListeners(elem)
			console.debug("Element removed from ElementSet", this.size)
		}
		this.applyUpdates()
		return deleted
	}

	clear() {
		super.clear()
		for (const elem of this) {
			this.#removeListeners(elem)
		}
		console.debug("All elements cleared from ElementSet", this.size)
		this.applyUpdates()
	}
}
