export const visualEffects = {
	get enabled() {
		const effectsDisabled = sessionStorage.getItem("disable-effects")
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		const enabled = !(effectsDisabled || prefersReducedMotion)
		if (enabled) {
			document.body.classList.remove("disable-effects")
		} else {
			document.body.classList.add("disable-effects")
		}
		return enabled
	},
	get disabled() {
		return !this.enabled
	},
}

document.addEventListener("astro:after-swap", () => {
	visualEffects.enabled
})
