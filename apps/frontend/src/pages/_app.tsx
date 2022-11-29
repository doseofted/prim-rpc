import "../styles/globals.css"
import { Montserrat, Plus_Jakarta_Sans } from "@next/font/google"
import type { AppProps } from "next/app"

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

export default function App({ Component, pageProps }: AppProps) {
	return (
		<div className={["w-full min-h-screen font-sans", montserrat.variable, plusJakartaSans.variable].join(" ")}>
			<Component {...pageProps} />
		</div>
	)
}
