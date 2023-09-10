import React from "react"
import { motion } from "framer-motion"
import type { Variants } from "framer-motion"

interface IntroTextProps {
	text: string | string[]
	className?: string
	stagger?: number
	delay?: number
	duration?: number
}
export function IntroText(props: IntroTextProps) {
	const { text, className = "", stagger: staggerChildren = 0.5, delay: delayChildren = 0.5, duration = 0.6 } = props
	const variantsParent: Variants = { ready: { transition: { staggerChildren, delayChildren } } }
	const variantsChildren: Variants = {
		waiting: { opacity: 0.3, y: "100%" },
		ready: { opacity: 1, y: "0%", transition: { duration, ease: "circOut" } },
	}
	const textLines = typeof text === "string" ? [text] : text
	return (
		<motion.span className={className} variants={variantsParent} initial="waiting" animate="ready">
			{textLines.map((child, index) => (
				<React.Fragment key={index}>
					<span className="inline-block overflow-hidden">
						<motion.span className="inline-block" variants={variantsChildren}>
							{child}
						</motion.span>
					</span>
					{index !== textLines.length - 1 ? <br /> : null}
				</React.Fragment>
			))}
		</motion.span>
	)
}
