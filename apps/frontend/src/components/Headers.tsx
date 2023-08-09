import { Icon } from "@iconify/react"
import { useLenis } from "@/components/LenisProvider"
import Link from "next/link"
import { createElement, HTMLAttributes } from "react"

export function HeaderLink(props: HTMLAttributes<HTMLHeadingElement> & { as: `h${number}` }) {
	const { as: elementName, children, ...attrs } = props
	const lenis = useLenis()
	return createElement(
		elementName,
		{ ...attrs, className: "group relative flex items-center !pl-6 sm:!pl-0" },
		<>
			{"id" in attrs && (
				<Link
					href={["#", attrs.id ?? ""].join("")}
					aria-hidden="true"
					tabIndex={-1}
					className="inline-block absolute sm:opacity-40 group-hover:opacity-100 transition-opacity duration-300 align-middle transform -translate-x-6"
					onClick={event => {
						lenis?.scrollTo(event.target, { offset: -20 })
					}}>
					<Icon className="w-4 h-4" icon="carbon:link" />
				</Link>
			)}
			{children}
		</>
	)
}
