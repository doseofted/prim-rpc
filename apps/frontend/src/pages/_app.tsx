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

const mdxComponents = {
	a: (props: React.HTMLAttributes<HTMLAnchorElement> & { href: string }) => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
		const lenis = useLenis()
		return (
			<Link
				{...props}
				target={props.href.startsWith("http") ? "_blank" : "_self"}
				onClick={() =>
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
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
	return (
		<Layout
			data-theme="prim"
			className={[
				"w-full min-h-[100svh] font-sans",
				montserrat.variable,
				plusJakartaSans.variable,
				firaCodeMono.variable,
			].join(" ")}>
			<Head>
				<link rel="icon" href="/placeholder.png" sizes="192x192" type="image/png" />
				<link rel="apple-touch-icon" href="/placeholder.png" />
			</Head>
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
