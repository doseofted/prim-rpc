import defu from "defu"
import { Light } from "."

type ValueRange<T> = [min: T, max: T]

interface LightGroupOptions {
	count: number
	colors: string[]
	brightness: ValueRange<number>
	size: ValueRange<number>
	offset: ValueRange<[number, number]>
}

export class LightGroup {
	lights

	constructor(options: Partial<LightGroupOptions>) {
		options = defu<LightGroupOptions, LightGroupOptions[]>(options, {
			count: 10,
			colors: ["#f0A3FF", "#f0A3FF", "#6D53FF", "#1D0049", "#0069BA", "#5BB8FF", "#4AEDFF"],
			brightness: [0, 1],
			size: [0, 100],
			offset: [
				[-100, -100],
				[100, 100],
			],
		})
		this.lights = Array.from(Array(options.count), () => {
			if (!options.colors) {
				return
			}
			const color = options.colors[Math.floor(Math.random() * options.colors.length)]
			return new Light({
				color,
			})
		})
	}
}
