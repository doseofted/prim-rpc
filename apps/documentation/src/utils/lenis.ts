import Lenis from "@studio-freight/lenis"
import { easeOutExpo } from "./easings"

const USE_LENIS = true

export const lenis = USE_LENIS
	? new Lenis({
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
	: {
			/** If Lenis isn't given, add back method called in TableOfContents.astro and use native behavior */
			scrollTo(_given: string) {
				window.scrollTo({ top: 0, behavior: "smooth" })
			},
			raf(_time: number) {},
	  }

declare global {
	interface Window {
		lenis: Lenis | { scrollTo(given: string): void }
	}
}
window.lenis = lenis

function raf(time: number) {
	lenis.raf(time)
	requestAnimationFrame(raf)
}
if (USE_LENIS) requestAnimationFrame(raf)

function handleHashNavigation() {
	for (const possibleLink of document.querySelectorAll<HTMLAnchorElement>('a[href*="#"]')) {
		try {
			const possibleUrl = new URL(possibleLink.href)
			if (!possibleUrl.hash) continue
			possibleLink.addEventListener("click", function (event) {
				if (location.pathname !== this.pathname || location.search !== this.search) return
				event.preventDefault()
				lenis.scrollTo(this.hash)
				location.hash = this.hash
			})
			// eslint-disable-next-line no-empty -- If URL creation fails, it's irrelevant, no need to handle error
		} catch {}
	}
}

document.addEventListener("DOMContentLoaded", handleHashNavigation)
document.addEventListener("astro:after-swap", handleHashNavigation)
