import React, { useEffect } from "react"
import { animate, stagger } from "motion"
import { easeOutExpo } from "@/utils/easings"
import { $navigationHappened } from "@/utils/store"

interface IntroTextProps {
	text: string | string[]
	className?: string
	stagger?: number
	delay?: number
	duration?: number
}
export function IntroText(props: IntroTextProps) {
	const { text, stagger: staggerChildren = 0.5, delay: delayChildren = 0.5, duration = 0.6 } = props
	const textLines = typeof text === "string" ? [text] : text
	const elements: (HTMLSpanElement | null)[] = []
	useEffect(() => {
		animate(
			elements.filter((e): e is HTMLSpanElement => !!e),
			{
				y: ["100%", "0%"],
				opacity: [0.3, 1],
			},
			{ duration, delay: stagger(staggerChildren, { start: delayChildren }), easing: easeOutExpo }
		)
	}, [])
	return (
		<>
			{textLines.map((text, index) => (
				<React.Fragment key={index}>
					<span className="inline-block overflow-hidden">
						<span ref={span => elements.push(span)} className="inline-block" style={{ opacity: 0 }}>
							{text}
						</span>
					</span>
					{index !== textLines.length - 1 ? <br /> : null}
				</React.Fragment>
			))}
		</>
	)
}

export function HomepageIntro(props: IntroTextProps) {
	const homeProps: IntroTextProps = {
		...props,
		delay: 0,
		duration: 0.9,
		stagger: $navigationHappened.value ? 0.3 : 0.8,
	}
	return <IntroText {...homeProps} />
}
