import '../styles/globals.css'
import { Montserrat, Plus_Jakarta_Sans } from '@next/font/google'
import type { AppProps } from 'next/app'

const montserrat = Montserrat({
  variable: "--montserrat",
  subsets: ["latin"]
})
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"]
})

export default function App({ Component, pageProps }: AppProps) {
  return <div
    className={[
      "w-full min-h-screen",
      montserrat.variable,
      plusJakartaSans.variable
    ].join(" ")}>
    <Component {...pageProps} />
  </div>
}
