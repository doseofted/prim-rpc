import { IntroText } from "@/components/IntroText"
import { OpinionatedLight } from "@/components/LightsState"
import { Title } from "@/components/Title"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
export default function Cms() {
	const [state, setState] = useState<"enter" | "exit">("exit")
	useEffect(() => {
		setTimeout(() => {
			setState("enter")
		}, 300)
	}, [])
	return (
		<>
			<Title>CMS</Title>
			<div className="pointer-events-none relative min-h-screen py-8 container mx-auto grid grid-cols-12 px-4 gap-4">
				<div className="col-span-12 h-16" />
				<div className="relative col-span-12 pointer-events-auto text-center text-prim-space">
					<p className="font-title text-[3rem] lg:text-[5.5rem] font-semibold uppercase leading-none">
						<IntroText delay={0.7} stagger={0.9}>
							A better CMS.
						</IntroText>
					</p>
					<motion.p style={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="pr-4">
						Content management built on Prim+RPC. Follow for updates.
					</motion.p>
					<OpinionatedLight count={14} focus={0.3} size={1200} state={state} />
				</div>
			</div>
		</>
	)
}
