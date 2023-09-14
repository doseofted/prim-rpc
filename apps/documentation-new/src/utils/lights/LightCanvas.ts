import { CanvasSpace, Circle, Pt } from "pts"
import { lighten, transparentize } from "color2k"
import { easeIn, easeOut, clamp } from "framer-motion/dom"
import type { LightElements } from "./LightElements"

/**
 * Place Lights on a canvas.
 *
 * **Note:** the canvas should be fixed to and fill the entire viewport.
 */
export function createLightCanvas(lights: LightElements, canvas: HTMLCanvasElement | string) {
	const possibleCanvas = typeof canvas === "string" ? document.querySelector(canvas) : canvas
	if (possibleCanvas instanceof HTMLCanvasElement) {
		canvas = possibleCanvas
	}

	const space = new CanvasSpace(canvas).setup({ resize: true, retina: false })
	const form = space.getForm()

	space.add(() => {
		form.composite("screen")
		for (const light of lights) {
			const { brightness, color, size, offset } = light
			const centerPt = new Pt(offset)
			const colorStart = transparentize(
				lighten(color, (clamp(1.5, 2, brightness) - 1.5) * 2),
				easeIn(clamp(0, 1, 1 - brightness))
			)
			const colorEnd = transparentize(colorStart, 1)
			const gradientColor = form.gradient([colorStart, colorEnd])
			const gradientShape = gradientColor(
				Circle.fromCenter(centerPt, (size * easeOut(clamp(0, 1, brightness - 1))) / 2),
				Circle.fromCenter(centerPt, size)
			)
			const circle = Circle.fromCenter(centerPt, size)
			form.fill(gradientShape).stroke(false).circle(circle)
		}
	})
	space.play()
	return () => space.dispose()
}
