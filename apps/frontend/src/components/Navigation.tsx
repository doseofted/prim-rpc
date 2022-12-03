import React from "react"
import { OpinionatedLight } from "../components/LightsState"
// import Link from "next/link"

type NavigationProps = React.HTMLAttributes<HTMLDivElement>
export function Navigation(props: NavigationProps) {
	const { ...attrs } = props
	const state = "enter"
	return (
		<div {...attrs} className={[attrs.className, "flex justify-between items-center gap-8"].join(" ")}>
			<div className="inline-block">
				{/* FIXME: next/link doesn't seem to work when navigating from docs -> homepage */}
				{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
				<a href="/" className="group relative">
					<p className="font-title text-[1.5rem] lg:text-[3rem] select-none font-normal transition-[font-weight] duration-500 group-hover:font-medium text-prim-space uppercase">
						Prim+
						<span className="font-bold transition-[font-weight] delay-100 duration-500 group-hover:font-extrabold">
							RPC
						</span>
					</p>
					<OpinionatedLight count={12} state={state} size={700} />
				</a>
			</div>
			<div className="bg-white/70 border-b border-l border-white/70 rounded-bl-2xl h-full flex items-center relative">
				<div className="bg-white/70 border-l border-white/70 w-screen h-screen absolute top-0 -left-[1px] transform -translate-y-full" />
				<div className="bg-white/70 border-b border-white/70 w-screen absolute top-0 -bottom-[1px] right-0 transform translate-x-full" />
				{[
					{ name: "Documentation", link: "/docs" },
					{ name: "About", link: "/" },
					// { name: "Callbacks", link: "/tests/callbacks" },
					// { name: "Form", link: "/tests/form" },
					// { name: "Greeting", link: "/tests/greeting" },
					// { name: "Lighting", link: "/tests/lighting" },
					// { name: "Lights", link: "/tests/lights" },
				].map(({ name, link }, i) => (
					<React.Fragment key={i}>
						{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
						<a
							className="group font-semibold uppercase text-sm h-full px-6 p-4 flex justify-center items-center rounded-2xl transition-all duration-300
								bg-transparent hover:bg-white transform scale-100 hover:scale-105"
							href={link}>
							<span className="transition-all duration-300 transform">{name}</span>
						</a>
					</React.Fragment>
				))}
			</div>
		</div>
	)
}
