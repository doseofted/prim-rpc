import React, { useMemo } from "react"
import { OpinionatedLight } from "@/components/LightsState"
import { motion } from "framer-motion"
import { useRouter } from "next/router"
import { Icon } from "@iconify/react"
import Link from "next/link"

type NavigationProps = React.HTMLAttributes<HTMLDivElement>
export function Navigation(props: NavigationProps) {
	const { ...attrs } = props
	const state = "enter"
	const router = useRouter()
	const homepage = useMemo(() => router.pathname === "/", [router.pathname])
	return (
		<div {...attrs} className={[attrs.className, "flex justify-between items-center gap-8"].join(" ")}>
			<div className="inline-block">
				<Link href="/" className="group relative">
					<p className="font-title text-[2.5rem] lg:text-[3rem] select-none font-normal transition-[font-weight] duration-500 group-hover:font-medium text-prim-space uppercase">
						Prim+
						<span className="font-bold transition-[font-weight] delay-100 duration-500 group-hover:font-extrabold">
							RPC
						</span>
					</p>
					<OpinionatedLight count={12} state={state} size={700} />
				</Link>
			</div>
			<motion.div
				initial={{ y: -20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 1, delay: homepage ? 2.8 : 0.5, ease: "circOut" }}
				className="hidden lg:flex bg-white/70 border-b border-l border-white/70 text-black rounded-bl-2xl h-full items-center relative">
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
						<Link
							className="group font-semibold uppercase text-sm h-full px-6 p-4 flex justify-center items-center rounded-b-2xl transition-all duration-300
								bg-transparent hover:bg-white transform scale-100 hover:scale-110"
							href={link}>
							<div className="pointer-events-none w-full h-screen transition-all duration-300 bg-transparent group-hover:bg-white absolute top-0 transform -translate-y-full" />
							<span className="transition-all duration-300 transform">{name}</span>
						</Link>
					</React.Fragment>
				))}
				<Link
					className="group font-semibold uppercase text-sm h-full px-4 p-4 flex justify-center items-center rounded-b-2xl
						transition-all duration-300
						bg-transparent hover:bg-white transform scale-100 hover:scale-110"
					href="https://twitter.com/doseofted"
					target="_blank">
					<div className="pointer-events-none w-full h-screen transition-all duration-300 bg-transparent group-hover:bg-white absolute top-0 transform -translate-y-full" />
					<span className="transition-all duration-300 transform">
						<Icon className="w-6 h-6" icon="simple-icons:twitter" />
						<span className="sr-only">Twitter</span>
					</span>
				</Link>
				<Link
					className="group font-semibold uppercase text-sm h-full px-4 p-4 flex justify-center items-center rounded-b-2xl transition-all duration-300
						bg-transparent hover:bg-white transform scale-100 hover:scale-110"
					href="https://github.com/doseofted"
					target="_blank">
					<div className="pointer-events-none w-full h-screen transition-all duration-300 bg-transparent group-hover:bg-white absolute top-0 transform -translate-y-full" />
					<span className="transition-all duration-300 transform">
						<Icon className="w-6 h-6" icon="simple-icons:github" />
						<span className="sr-only">Github</span>
					</span>
				</Link>
			</motion.div>
		</div>
	)
}
