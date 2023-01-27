import Lenis from "@studio-freight/lenis"
import { createContext, useContext, useEffect, useState } from "react"

const LenisContext = createContext<Lenis | null>(null)

export function useLenis(): Lenis | null {
	const ctx = useContext(LenisContext)
	return ctx
}

/** https://easings.net/#easeOutExpo */
function easeOutExpo(x: number): number {
	return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
}

interface LenisProviderProps {
	children: React.ReactNode
	enabled?: boolean
}

export function LenisProvider({ children, enabled = true }: LenisProviderProps) {
	const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null)
	useEffect(() => {
		const lenis = enabled
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
		setLenisInstance(lenis)
		function raf(time: number) {
			lenis?.raf(time)
			requestAnimationFrame(raf)
		}
		requestAnimationFrame(raf)
		return () => {
			lenis?.destroy()
		}
	}, [])
	return <LenisContext.Provider value={lenisInstance}>{children}</LenisContext.Provider>
}
