import Link from "next/link"
import { OpinionatedLight } from "./LightsState"

interface Props {
	state: "enter" | "exit"
	product?: string
}

export function PrimTitle(props: Props) {
	const { product = "RPC" } = props
	return (
		<Link href="/" className="group relative">
			<p className="font-title text-[2.5rem] lg:text-[3rem] select-none font-normal transition-[font-weight] duration-500 group-hover:font-medium text-prim-space uppercase">
				Prim+
				<span className="font-bold transition-[font-weight] delay-100 duration-500 group-hover:font-extrabold">
					{product}
				</span>
			</p>
			<OpinionatedLight count={12} state={props.state} size={700} />
		</Link>
	)
}
