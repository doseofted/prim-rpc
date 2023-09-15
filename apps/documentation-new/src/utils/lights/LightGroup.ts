import defu from "defu"
import { Light, LightState, type LightProperties } from "./Light"
import { easeOut } from "framer-motion/dom"

type NumericalValueRange<T> = [min: T, max: T]
interface LightGroupOptions {
	colors: string[]
	brightness: NumericalValueRange<number>
	size: NumericalValueRange<number>
	offset: NumericalValueRange<[number, number]>
	interval: NumericalValueRange<number>
}

/**
 * A light group contains multiple lights and is controlled by properties set on the group.
 * The other lights in the group are variations of the primary light and are used to
 * create a colorful glow effect.
 */
export class LightGroup implements LightProperties {
	ranges: LightGroupOptions

	brightness: number
	size: number
	color: string
	center: [x: number, y: number]
	offset: [x: number, y: number]

	#lights: Light[] = []

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
						// light.offset
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

	constructor(options: Partial<LightProperties>, defaultRanges: Partial<LightGroupOptions>) {
		this.ranges = defu<LightGroupOptions, LightGroupOptions[]>(defaultRanges, {
			colors: ["#f0A3FF", "#f0A3FF", "#6D53FF", "#1D0049", "#0069BA", "#5BB8FF", "#4AEDFF"],
			brightness: [0, 2],
			size: [0, 100],
			offset: [
				[-100, -100],
				[100, 100],
			],
			interval: [500, 1000],
		})
		const optionsInit = this.#generateOptions(options)
		this.brightness = optionsInit.brightness
		this.size = optionsInit.size
		this.color = optionsInit.color
		this.center = optionsInit.center
		this.offset = optionsInit.offset
		this.setInterval()
	}

	setLightCount(count: number, options: Partial<LightProperties>) {
		// const previousListLength = this.#lights.length
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
		} else if (count === 0) {
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
		// const listLengthChanged = previousListLength !== this.#lights.length
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
