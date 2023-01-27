import { Icon } from "@iconify/react"
import { useLenis } from "@/components/LenisProvider"
import Link from "next/link"
import { createElement, HTMLAttributes } from "react"

export function HeaderLink(props: HTMLAttributes<HTMLHeadingElement> & { as: `h${number}` }) {
	const { as: elementName, children, ...attrs } = props
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	const lenis = useLenis()
	return createElement(
		elementName,
		{ ...attrs, className: "group relative flex items-center" },
		<>
			{"id" in attrs && (
				<Link
					href={["#", attrs.id ?? ""].join("")}
					aria-hidden="true"
					tabIndex={-1}
					className="inline-block absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 align-middle transform -translate-x-6"
					onClick={event => {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
						lenis?.scrollTo(event.target, { offset: -20 })
					}}>
					<Icon className="w-4 h-4" icon="carbon:link" />
				</Link>
			)}
			{children}
		</>
	)
}
