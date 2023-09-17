import { CanvasSpace, Circle, Pt } from "pts"
import { lighten, transparentize } from "color2k"
import { easeIn, easeOut, clamp, transform } from "framer-motion/dom"
import type { LightElements } from "./LightElements"
import { createConsola } from "consola"

const console = createConsola({ level: 5 }).withTag("LightCanvas")

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
	const debug = false

	space.add(() => {
		form.composite("screen")
		const screenSize = space.width // Math.min(space.width, space.height)
		for (const light of lights) {
			const { center, offset, brightness, color, size: sizeBase } = light
			const size = transform(sizeBase, [0, 100], [0, screenSize])
			const centerPt = new Pt(center).$add(new Pt(offset))
			const lightStart = 1.5 // point at which `lighten()` starts
			const colorStart = transparentize(
				lighten(color, easeIn((clamp(lightStart, 2, brightness) - lightStart) * 2)),
				easeOut(clamp(0, 1, 1 - brightness))
			)
			const colorEnd = transparentize(colorStart, 1)
			const gradientShape = form.gradient([colorStart, colorEnd])
			const gradientStartShape = Circle.fromCenter(centerPt, (size * easeIn(clamp(0, 1, brightness - 1))) / 2)
			const circleShape = Circle.fromCenter(centerPt, size)
			const gradientFill = gradientShape(gradientStartShape, circleShape)
			const stroke = debug ? "white" : false
			form.fill(gradientFill).stroke(stroke).circle(circleShape)
		}
	})
	space.play()
	console.debug("Canvas animation started")
	return () => space.dispose()
}
