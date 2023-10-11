import { visualEffects } from "../disable-effects"
import { LightElements } from "./LightElements"

// NOTE: only one instance of LightEvents is needed for a page
console.info("Light events instance initialized")
const init = visualEffects.enabled

export const lights = new LightElements(init)

export * from "./LightCanvas"
