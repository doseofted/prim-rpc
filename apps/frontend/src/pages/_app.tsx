import "@code-hike/mdx/dist/index.css"
import "../styles/globals.css"
import { Fira_Code, Montserrat, Plus_Jakarta_Sans } from "@next/font/google"
import type { AppProps } from "next/app"
import Layout from "@/components/Layout"
import Lenis from "@studio-freight/lenis"
import React, { useEffect } from "react"
import { MDXProvider } from "@mdx-js/react"
import Link from "next/link"
import { HeaderLink } from "@/components/Headers"

const mdxComponents = {
	a: (props: React.HTMLAttributes<HTMLAnchorElement> & { href: string }) => <Link {...props} />,
	h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <HeaderLink as="h2" {...props} />,
	h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <HeaderLink as="h3" {...props} />,
}

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
	const useLenis = true
	useEffect(() => {
		const lenis = useLenis
			? new Lenis({
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
			: null
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
			data-theme="prim"
			className={[
				"w-full min-h-screen font-sans",
				montserrat.variable,
				plusJakartaSans.variable,
				firaCodeMono.variable,
			].join(" ")}>
			{/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */}
			<MDXProvider components={mdxComponents as any}>
				<Component {...pageProps} />
			</MDXProvider>
		</Layout>
	)
}
