import defu from "defu"
import { Light, LightState, type LightProperties } from "./Light"
import { createConsola } from "consola"
// import { easeOut, transform } from "framer-motion/dom"

const console = createConsola({ level: 5 }).withTag("LightGroup")

type NumericalValueRange<T> = [min: T, max: T]
interface LightGroupOptions {
	colors: string[]
	size: NumericalValueRange<number>
	offset: NumericalValueRange<number>
	brightness: NumericalValueRange<number>
	interval: NumericalValueRange<number>
}

/**
 * A light group contains multiple lights and is controlled by properties set on the group.
 * The other lights in the group are variations of the primary light and are used to
 * create a colorful glow effect.
 */
export class LightGroup /* implements LightProperties */ {
	ranges: LightGroupOptions

	// brightness: number
	// size: number
	// color: string
	// center: [x: number, y: number]
	// offset: [x: number, y: number]

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
	setInterval() {
		clearInterval(this.#interval)
		const base = this.ranges.interval[0]
		this.#interval = window.setInterval(() => {
			window.setTimeout(
				() => {
					for (const light of this.#lights) {
						const [min, max] = this.ranges.offset
						const offsetX = this.utils.randomInt(min * -1, max)
						const offsetY = this.utils.randomInt(min * -1, max)
						const angle = Math.random() * Math.PI * 2
						light.offset = [Math.cos(angle) * offsetX, Math.sin(angle) * offsetY]
						// TODO: determine best way to decrease brightness based on offset
						// This may become a behavior of and be moved into `Light` class
						// const offsetDistanceFromMax = Math.sqrt(offsetX ** 2 + offsetY ** 2)
						// light.brightness = easeOut(light.brightness * offsetDistanceFromMax / max)
					}
				},
				this.utils.randomInt(...this.ranges.interval) - base
			)
		}, base)
	}

	destroy() {
		clearInterval(this.#interval)
		// for (const light of this.#lights) {
		// 	light.destroy()
		// }
	}

	constructor(defaultRanges: Partial<LightGroupOptions>) {
		this.ranges = defu<LightGroupOptions, LightGroupOptions[]>(defaultRanges, {
			colors: ["#f0A3FF", "#f0A3FF", "#6D53FF", "#1D0049", "#0069BA", "#5BB8FF", "#4AEDFF"],
			brightness: [0.5, 1.5],
			size: [300, 500],
			offset: [0, 300],
			interval: [1000, 2000],
		})
		this.setInterval()
	}

	updateRanges(ranges: Partial<LightGroupOptions>) {
		Object.assign(this.ranges, ranges)
	}

	setLightCount(count: number, options: Pick<LightProperties, "center">, removalAll = false) {
		// NOTE: removalAll and count === 0 are not the same condition (even though they feel similar)
		const previousListLength = this.#lights.length
		const activeLights = this.#lights.filter(({ beingDestroyed }) => !beingDestroyed)
		const newCount = count - activeLights.length
		if (count > activeLights.length) {
			const newLights = Array.from(Array(newCount)).map(() => new Light(this.#generateOptions(options)))
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
			if (!removalAll) light.center = options.center
		}
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
