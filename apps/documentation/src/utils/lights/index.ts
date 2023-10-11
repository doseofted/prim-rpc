import { LightElements } from "./LightElements"

// NOTE: only one instance of LightEvents is needed for a page
console.info("Light events instance initialized")
export const lights = new LightElements()

const effectsDisabled = sessionStorage.getItem("disable-effects")
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
if (effectsDisabled || prefersReducedMotion) {
	lights.destroy()
}

export * from "./LightCanvas"
