import { OpinionatedLight } from "../components/LightsState"
// import Link from "next/link"

type NavigationProps = React.HTMLAttributes<HTMLDivElement>
export function Navigation(props: NavigationProps) {
	const { ...attrs } = props
	const state = "enter"
	return (
		<div {...attrs} className={[attrs.className].join(" ")}>
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
		</div>
	)
}
