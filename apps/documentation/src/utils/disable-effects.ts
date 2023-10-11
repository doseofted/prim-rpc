export const visualEffects = {
	get enabled() {
		const effectsDisabled = sessionStorage.getItem("disable-effects")
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		return !(effectsDisabled || prefersReducedMotion)
	},
	get disabled() {
		return !this.enabled
	},
}
