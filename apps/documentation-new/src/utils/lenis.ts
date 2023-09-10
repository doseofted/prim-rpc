import Lenis from "@studio-freight/lenis"

/** https://easings.net/#easeOutExpo */
function easeOutExpo(x: number): number {
	return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
}

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
