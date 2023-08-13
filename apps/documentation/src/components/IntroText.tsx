import React, { ReactNode } from "react"
import { motion, Variants } from "framer-motion"

interface IntroTextProps {
	className?: string
	children?: React.ReactNode | ReactNode[]
	stagger?: number
	delay?: number
	duration?: number
}
export function IntroText(props: IntroTextProps) {
	const {
		className = "",
		children = [],
		stagger: staggerChildren = 0.5,
		delay: delayChildren = 0.5,
		duration = 0.6,
	} = props
	const animationContainer: Variants = {
		ready: {
			transition: {
				staggerChildren,
				delayChildren,
			},
		},
	}
	const childrenVariants: Variants = {
		waiting: { opacity: 0.3, y: "100%" },
		ready: { opacity: 1, y: "0%", transition: { duration, ease: "circOut" } },
	}
	const childrenList = React.Children.toArray(children)
	return (
		<motion.span className={className} variants={animationContainer} initial="waiting" animate="ready">
			{childrenList.map((child, index) => (
				<React.Fragment key={index}>
					<span className="inline-block overflow-hidden">
						<motion.span className="inline-block" variants={childrenVariants}>
							{child}
						</motion.span>
					</span>
					{index !== childrenList.length - 1 ? <br /> : null}
				</React.Fragment>
			))}
		</motion.span>
	)
}
