import Lenis from "@studio-freight/lenis"
import { easeOutExpo } from "./easings"

const lenis = new Lenis({
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
