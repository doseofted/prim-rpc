import { LightElements } from "./LightElements"

// NOTE: only one instance of LightEvents is needed for a page
console.info("Light events instance initialized")
export const lights = new LightElements()

export * from "./LightCanvas"
