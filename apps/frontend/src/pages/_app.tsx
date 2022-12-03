import "@code-hike/mdx/dist/index.css"
import "../styles/globals.css"
import { Fira_Code, Montserrat, Plus_Jakarta_Sans } from "@next/font/google"
import type { AppProps } from "next/app"
import Layout from "../components/Layout"
import Lenis from "@studio-freight/lenis"
import { useEffect } from "react"

const montserrat = Montserrat({
	variable: "--font-montserrat",
	subsets: ["latin"],
	display: "swap",
})
const plusJakartaSans = Plus_Jakarta_Sans({
	variable: "--font-jakarta",
	subsets: ["latin"],
	display: "swap",
})
const firaCodeMono = Fira_Code({
	variable: "--font-fira",
	subsets: ["latin"],
	display: "swap",
})

/** https://easings.net/#easeOutExpo */
function easeOutExpo(x: number): number {
	return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
}

export default function App({ Component, pageProps }: AppProps) {
	useEffect(() => {
		const lenis = new Lenis({
			duration: 1,
			easing: easeOutExpo,
			direction: "vertical",
			gestureDirection: "vertical",
			smooth: true,
			mouseMultiplier: 1,
			smoothTouch: false,
			touchMultiplier: 2,
			infinite: false,
		})
		function raf(time: number) {
			lenis?.raf(time)
			requestAnimationFrame(raf)
		}
		requestAnimationFrame(raf)
		return () => {
			lenis?.destroy()
		}
	}, [])
	return (
		<Layout
			className={[
				"w-full min-h-screen font-sans",
				montserrat.variable,
				plusJakartaSans.variable,
				firaCodeMono.variable,
			].join(" ")}>
			<Component {...pageProps} />
		</Layout>
	)
}
