import { CanvasSpace, Circle, Pt } from "pts"
import { lighten, transparentize } from "color2k"
import { easeIn, easeOut, clamp } from "framer-motion/dom"
import type { LightElements } from "./LightElements"

const debug = false

/**
 * Place Lights on a canvas.
 *
 * **Note:** the canvas should be fixed to and fill the entire viewport.
 */
export function createLightCanvas(lights: LightElements, parent: HTMLElement | string) {
	const canvas = createDomStructure(parent, debug)
	const space = new CanvasSpace(canvas).setup({ resize: true, retina: false })
	const form = space.getForm()
	if (debug) console.log("Lights", lights)
	space.add(() => {
		form.composite("screen")
		// console.log(lights.length)
		// const screenSize = space.width // Math.min(space.width, space.height)
		if (debug) console.log("Lights count", lights.length)
		for (const light of lights) {
			const { center, offset, brightness, color, size /* : sizeBase */ } = light
			// const size = transform(sizeBase, [0, 100], [0, screenSize])
			const centerPt = new Pt(center).$add(new Pt(offset))
			const lightStart = 1.5 // point at which `lighten()` starts
			const colorStart = transparentize(
				lighten(color, easeIn((clamp(lightStart, 2, brightness) - lightStart) * 2)),
				easeOut(clamp(0, 1, 1 - brightness))
			)
			const colorEnd = transparentize(colorStart, 1)
			const gradientShape = form.gradient([colorStart, colorEnd])
			const gradientStartShape = Circle.fromCenter(centerPt, (size * easeIn(clamp(0, 1, brightness - 1))) / 2)
			if (size <= 0) continue // FIXME: find out why size is sometimes less than 0 when page is left in background
			const circleShape = Circle.fromCenter(centerPt, size)
			const gradientFill = gradientShape(gradientStartShape, circleShape)
			const stroke = debug ? "white" : false
			form.fill(gradientFill).stroke(stroke).circle(circleShape)
		}
	})
	space.play()
	if (debug) console.debug("Canvas animation started")
	return () => space.dispose()
}

/**
 * Given an HTML `<div />` element create structure needed to display lights properly.
 *
 * Given an HTML `<canvas />` element, return it as-is, assume pre-configured.
 */
function createDomStructure(parent: HTMLElement | string, debug = false) {
	const possibleParent = typeof parent === "string" ? document.querySelector(parent) : parent
	if (possibleParent instanceof HTMLCanvasElement) {
		return possibleParent
	}
	const canvas = document.createElement("canvas")
	canvas.style.position = "absolute"
	canvas.style.inset = "0"
	canvas.style.width = "100%"
	canvas.style.height = "100%"
	const blurLayer = document.createElement("div")
	blurLayer.style.position = "absolute"
	blurLayer.style.inset = "0"
	blurLayer.style.width = "100%"
	blurLayer.style.height = "100%"
	blurLayer.style.backgroundColor = "transparent"
	if (!debug) {
		blurLayer.style.backdropFilter = "blur(16px) saturate(1.5)"
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore -- vendor prefix that Safari still needs
		blurLayer.style.webkitBackdropFilter = "blur(16px) saturate(1.5)"
	}
	if (possibleParent instanceof HTMLElement) {
		parent = possibleParent
		parent.appendChild(canvas)
		parent.appendChild(blurLayer)
	}
	return canvas
}
