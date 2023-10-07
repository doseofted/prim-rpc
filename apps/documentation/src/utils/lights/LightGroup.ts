import defu from "defu"
import { Light, LightState, type LightProperties } from "./Light"
import { createConsola } from "consola"
import { easeOut, transform } from "framer-motion/dom"
import mitt from "mitt"

const level = import.meta.env.PROD ? 0 : 5
const console = createConsola({ level }).withTag("LightGroup")

type NumericalValueRange<T> = [min: T, max: T]
interface LightGroupOptions {
	colors: string[]
	size: NumericalValueRange<number>
	offset: [xMax: number, yMax: number]
	brightness: NumericalValueRange<number>
	interval: NumericalValueRange<number>
}

// export type Coord = [x: number, y: number]
// type Bounds = DOMRect & { center: Coord }

type LightGroupEvents = {
	destroyed: undefined
}

/**
 * A light group contains multiple lights and is controlled by properties set on the group.
 * The other lights in the group are variations of the primary light and are used to
 * create a colorful glow effect.
 */
export class LightGroup {
	#events = mitt<LightGroupEvents>()

	ranges: LightGroupOptions

	#lights: Light[] = []
	get lights() {
		return this.#lights
	}

	#generateOptions = (options: Partial<LightProperties> = {}) => {
		return defu<LightProperties, LightProperties[]>(options, {
			center: [0, 0], // this should be given
			offset: [0, 0], // this should always default to 0 unless purposely overridden
			brightness: this.utils.randomDouble(...this.ranges.brightness),
			size: this.utils.randomInt(...this.ranges.size),
			color: this.utils.randomArrayItem(this.ranges.colors),
		})
	}

	#interval: number | undefined
	#intervalRunCount = 0
	#firstRun = true
	setInterval() {
		clearInterval(this.#interval)
		const base = this.ranges.interval[0]
		const animate = () => {
			window.setTimeout(
				() => {
					const count = this.#lights.length
					let index = 0
					for (const light of this.#lights) {
						const [xMax, yMax] = this.ranges.offset
						const max = Math.max(xMax, yMax)
						const angle = Math.random() * Math.PI * 2
						// NOTE: since spring motion blends values with tight intervals, place offset at circle circumference,
						// so that the offset jumps around more (but remains within offset bounds)
						const offsetBase = [
							(Math.cos(angle) * max) / 2, // this.utils.randomInt(0, max),
							(Math.sin(angle) * max) / 2, // this.utils.randomInt(0, max),
						]
						// const distance = Math.sqrt(offsetBase[0] ** 2 + offsetBase[1] ** 2)
						const easing = easeOut(transform(index, [0, count], [0.5, 1]))
						const offset = offsetBase.map(o => o * easing) as [number, number]
						// const offsetBase = [xMax, yMax].map(max => this.utils.randomDouble(max * -1, max))
						// const offset = offsetBase.map(max => transform(index, [0, count], [0, max])) as [number, number]
						light.offset = offset
						// NOTE: since lights are additive, make lights closer to the center dimmer
						const highestBrightness = this.ranges.brightness[1]
						const baseBrightness = this.utils.randomDouble(...this.ranges.brightness)
						const brightness = transform(index, [0, count], [baseBrightness, highestBrightness])
						// console.log(distance, brightness)
						light.brightness = brightness
						const size = this.utils.randomInt(...this.ranges.size)
						// const size = transform(distance, [0, maxOffset], [baseSize, minSize])
						light.size = size
						const randomColorChange = this.#intervalRunCount % transform(Math.random(), [0, 1], [10, 15])
						if (!randomColorChange) {
							light.color = this.utils.randomArrayItem(this.ranges.colors)
						}
						index++
					}
					// console.debug("---")
					this.#intervalRunCount += 1
				},
				!this.#firstRun ? this.utils.randomInt(...this.ranges.interval) - base : 0
			)
			if (this.#firstRun) this.#firstRun = false
		}
		this.#interval = window.setInterval(animate, base)
		animate()
	}

	onDestroyed(cb?: () => void) {
		this.#events.on("destroyed", () => cb?.())
		// this event can only fire once
		this.#events.all.clear()
	}

	destroy() {
		clearInterval(this.#interval)
		let lightToBeDestroyed = 0
		let lightsDestroyed = 0
		let lightsDetermined = false
		for (const light of this.#lights) {
			if (light.state !== LightState.Destroyed) {
				lightToBeDestroyed += 1
				light.onDestroyed(() => {
					lightsDestroyed += 1
					// console.debug("Light was destroyed", lightsDestroyed, lightToBeDestroyed)
					if (lightsDetermined && lightsDestroyed === lightToBeDestroyed) {
						this.#lights = []
						this.#events.emit("destroyed")
						console.debug("LightGroup instance and Lights were destroyed")
					}
				})
			}
			light.changeState(LightState.Destroying)
		}
		lightsDetermined = true
		console.debug("LightGroup instance was destroyed, Lights pending", lightToBeDestroyed)
	}

	constructor(defaultRanges: Partial<LightGroupOptions>) {
		this.ranges = defu<LightGroupOptions, LightGroupOptions[]>(defaultRanges, {
			colors: ["#f0A3FF", "#f0A3FF", "#f0A3FF", "#6D53FF", "#1D0049", "#0069BA", "#5BB8FF", "#4AEDFF"],
			brightness: [0.9, 1.5],
			size: [100, 300],
			offset: [200, 200],
			interval: [800, 2300],
		})
		this.setInterval()
	}

	updateRanges(ranges: Partial<LightGroupOptions>) {
		Object.assign(this.ranges, ranges)
	}

	#dimensions: DOMRect | undefined
	get center(): [number, number] {
		const { left = 0, width = 0, top = 0, height = 0 } = this.#dimensions ?? {}
		return [left + width / 2, top + height / 2]
	}

	setLightCount(count: number, dimensions: DOMRect, removalAll = false) {
		// NOTE: removalAll and count === 0 are not the same condition (even though they feel similar)
		const previousListLength = this.#lights.length
		const activeLights = this.#lights.filter(({ beingDestroyed }) => !beingDestroyed)
		const newCount = count - activeLights.length
		this.#dimensions = dimensions
		const center = this.center
		console.debug("setting light count", { count, newCount, activeLights, center })
		if (count > activeLights.length) {
			const newLights = Array.from(Array(newCount)).map(() => {
				const generatedOptions = this.#generateOptions({ center })
				return new Light(generatedOptions)
			})
			this.#lights.push(...newLights)
			console.debug("adding lights", newCount, newLights)
		} else if (count < activeLights.length) {
			const removed = Math.abs(newCount)
			console.debug("marking lights for removal", removed)
			// NOTE: lights are not removed immediately, but instead are marked for removal
			for (const index of Array.from(Array(removed).keys())) {
				activeLights[index].changeState(LightState.Destroying)
			}
		} else if (removalAll) {
			console.debug("marking all lights for removal", this.#lights.length)
			for (const light of activeLights) {
				light.changeState(LightState.Destroying)
			}
		}
		const readyToBeRemoved = this.#lights
			.map((light, index) => (light.state === LightState.Destroyed ? index : -1))
			.filter(index => index !== -1)
			.reverse()
		for (const removeIndex of readyToBeRemoved) {
			this.#lights[removeIndex]?.destroy()
			this.#lights.splice(removeIndex, 1)
		}
		for (const light of this.#lights) {
			if (!removalAll) light.center = center
		}
		console.debug("lights change", previousListLength, this.#lights.length)
		const listLengthChanged = previousListLength !== this.#lights.length
		return listLengthChanged
	}

	utils = {
		/** Random float between min (inclusive) and max (exclusive) */
		randomDouble(min: number, max: number) {
			return Math.random() * (max - min) + min
		},
		/** Random integer between min-max (inclusive) */
		randomInt(min: number, max: number) {
			return Math.floor(Math.random() * (max - min + 1) + min)
		},
		/** Random item from the array */
		randomArrayItem<T>(array: T[]) {
			return array[this.randomInt(0, array.length - 1)]
		},
	}
}
