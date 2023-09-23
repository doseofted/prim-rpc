import Lenis from "@studio-freight/lenis"
import { easeOutExpo } from "./easings"

export const lenis = new Lenis({
	duration: 1,
	easing: easeOutExpo,
	orientation: "vertical",
	gestureOrientation: "vertical",
	smoothWheel: true,
	wheelMultiplier: 1,
	smoothTouch: false,
	touchMultiplier: 2,
	infinite: false,
})

function raf(time: number) {
	lenis.raf(time)
	requestAnimationFrame(raf)
}
requestAnimationFrame(raf)

function handleHashNavigation() {
	for (const possibleLink of document.querySelectorAll<HTMLAnchorElement>('a[href*="#"]')) {
		if (!possibleLink.hash.startsWith("#")) continue
		possibleLink.addEventListener("click", function (event) {
			event.preventDefault()
			lenis.scrollTo(this.hash)
			location.hash = this.hash
		})
	}
}

document.addEventListener("DOMContentLoaded", handleHashNavigation)
document.addEventListener("astro:after-swap", handleHashNavigation)
