import "@code-hike/mdx/dist/index.css"
import "../styles/globals.css"
import { Fira_Code, Montserrat, Plus_Jakarta_Sans } from "next/font/google"
import type { AppProps } from "next/app"
import Layout from "@/components/Layout"
import React from "react"
import { MDXProvider } from "@mdx-js/react"
import Link from "next/link"
import { HeaderLink } from "@/components/Headers"
import { LenisProvider, useLenis } from "@/components/LenisProvider"
import { DefaultSeo } from "next-seo"
import Head from "next/head"
import Script from "next/script"
import { useMount } from "react-use"

const mdxComponents = {
	a: (props: React.HTMLAttributes<HTMLAnchorElement> & { href: string }) => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const lenis = useLenis()
		return (
			<Link
				{...props}
				target={props.href.startsWith("http") ? "_blank" : "_self"}
				onClick={() =>
					props.href.startsWith("#") ? lenis?.scrollTo(document.querySelector(props.href), { offset: -20 }) : null
				}
			/>
		)
	},
	h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <HeaderLink as="h2" {...props} />,
	h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <HeaderLink as="h3" {...props} />,
	table: (props: React.HTMLAttributes<HTMLTableElement>) => (
		<div className="overflow-x-auto">
			<table {...props} />
		</div>
	),
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

export default function App({ Component, pageProps }: AppProps) {
	const fonts = [montserrat.variable, plusJakartaSans.variable, firaCodeMono.variable]
	useMount(() => {
		// NOTE: this is a workaround since Headless UI renders outside of this layout component
		// where font classes are given (they also need to be applied to the body for modals to be styled)
		document.body.classList.add("font-sans", ...fonts)
	})
	return (
		<Layout data-theme="prim" className={["w-full min-h-[100svh] font-sans", ...fonts].join(" ")}>
			<Head>
				<link rel="icon" href="/placeholder.png" sizes="192x192" type="image/png" />
				<link rel="apple-touch-icon" href="/placeholder.png" />
			</Head>
			<Script
				async
				src="https://stat.doseofted.me/tracker.js"
				data-ackee-server="https://stat.doseofted.me"
				data-ackee-domain-id="2954615f-b53a-4199-9109-b83d9ee12b04"
			/>
			<DefaultSeo twitter={{ handle: "@doseofted" }} themeColor="#2D0D60" />
			<LenisProvider>
				{/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */}
				<MDXProvider components={mdxComponents as any}>
					<Component {...pageProps} />
				</MDXProvider>
			</LenisProvider>
		</Layout>
	)
}
