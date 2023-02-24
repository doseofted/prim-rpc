import { Lights as LightsProvider } from "@/components/Lights"
import { motion } from "framer-motion"
import { transparentize } from "color2k"
import { Navigation } from "./Navigation"
import { useRouter } from "next/router"
import { useMemo } from "react"
import { websiteState } from "store"
import { useSnapshot } from "valtio"

type LayoutProps = React.HTMLAttributes<HTMLDivElement>
export default function Layout(props: LayoutProps) {
	const { children, ...attrs } = props
	const router = useRouter()
	const homepage = useMemo(() => router.pathname === "/", [router.pathname])
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const snapshot = useSnapshot(websiteState)
	return (
		<div {...attrs} className={["bg-prim-space", attrs.className].join(" ")}>
			{/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */}
			<LightsProvider disable={!snapshot.useLightEffect} options={{ size: 500 }} blur={25} saturate={1.3}>
				{/* NOTE: using overflow-hidden below may mean that children can't use sticky positioning (if needed for table of contents) */}
				<div className="relative min-h-[100svh] w-full z-2 overflow-hidden">
					{!homepage && (
						<div className="py-8 absolute container inset-x-0 mx-auto grid grid-cols-12 border-x border-transparent px-4 gap-4">
							<Navigation className="relative col-span-12" />
						</div>
					)}
					<div className="pointer-events-none fixed container w-full h-full inset-0 mx-auto grid grid-cols-12 border-x border-white/30 px-4 gap-4 mix-blend-overlay">
						{Array.from(Array(12), (_, i) => i).map((_, index) => (
							<motion.div
								key={index}
								className={["border-x col-span-2 lg:col-span-1", index >= 6 ? "hidden lg:block" : ""].join(" ")}
								initial={{ borderColor: transparentize("#fff", 1) }}
								animate={{ borderColor: transparentize("#fff", 0.7) }}
								transition={{ delay: 0.3 }}
							/>
						))}
					</div>
					{children}
				</div>
			</LightsProvider>
			{/* LINK https://github.com/tailwindlabs/headlessui/discussions/666#discussioncomment-2197931 */}
			<div id="headlessui-portal-root">
				<div />
			</div>
		</div>
	)
}
