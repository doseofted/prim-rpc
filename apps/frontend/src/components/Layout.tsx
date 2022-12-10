import { Lights as LightsProvider } from "@/components/Lights"
import { motion } from "framer-motion"
import { transparentize } from "color2k"
import { Navigation } from "./Navigation"
import { useRouter } from "next/router"
import { useMemo } from "react"

type LayoutProps = React.HTMLAttributes<HTMLDivElement>
export default function Layout(props: LayoutProps) {
	const { children, ...attrs } = props
	const router = useRouter()
	const homepage = useMemo(() => router.pathname === "/", [router.pathname])
	return (
		<div {...attrs} className={["bg-prim-space", attrs.className].join(" ")}>
			<LightsProvider options={{ size: 500 }} blur={25} saturate={1.3}>
				{/* NOTE: using overflow-hidden below may mean that children can't use sticky positioning (if needed for table of contents) */}
				<div className="relative min-h-screen w-full z-2 overflow-hidden">
					{!homepage && (
						<div className="py-8 absolute container inset-x-0 mx-auto grid grid-cols-12 border-x border-transparent px-4 gap-4">
							<Navigation className="relative col-span-12" />
						</div>
					)}
					<div className="pointer-events-none fixed container w-full h-full inset-0 mx-auto grid grid-cols-12 border-x border-white/30 px-4 gap-4 mix-blend-overlay">
						{Array.from(Array(12), (_, i) => i).map((_, index) => (
							<motion.div
								key={index}
								className="border-x"
								initial={{ borderColor: transparentize("#fff", 1) }}
								animate={{ borderColor: transparentize("#fff", 0.7) }}
								transition={{ delay: 0.3 }}
							/>
						))}
					</div>
					{children}
				</div>
			</LightsProvider>
		</div>
	)
}
