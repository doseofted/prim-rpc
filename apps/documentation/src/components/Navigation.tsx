import React, { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/router"
import { Icon } from "@iconify/react"
import Link from "next/link"
import Image from "next/image"
import { useSessionStorage } from "react-use"
import { Dialog } from "@headlessui/react"
import { Modal } from "@/components/Modal"
import { PrimTitle } from "@/components/PrimTitle"

type NavigationProps = React.HTMLAttributes<HTMLDivElement>
export function Navigation(props: NavigationProps) {
	const links = [
		{ name: "Docs", link: "/docs" },
		{ name: "CMS", link: "/cms" },
	]
	const socials = [
		{ name: "Threads", link: "https://www.threads.net/@doseofted", icon: "simple-icons:threads" },
		{ name: "GitHub", link: "https://github.com/doseofted/prim-rpc", icon: "simple-icons:github" },
	]
	const { ...attrs } = props
	const state = "enter"
	const router = useRouter()
	const homepage = useMemo(() => router.pathname === "/", [router.pathname])
	const [menuOpen, menuToggle] = useState(false)
	function clickHandler() {
		menuToggle(false)
	}
	const showAttributionInNavigation = true
	const [navigated, setNavigated] = useSessionStorage("navigated", false)
	useEffect(() => {
		setNavigated(true)
	}, [router.pathname, setNavigated])
	return (
		<div {...attrs} className={[attrs.className, "flex justify-between items-center gap-8"].join(" ")}>
			<div className="inline-block">
				<PrimTitle state={state} />
			</div>
			<motion.div
				initial={{ y: -20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 1, delay: navigated ? 0 : homepage ? 2.8 : 0.5, ease: "circOut" }}
				className="flex bg-white/70 border-b border-l border-white/70 text-black rounded-bl-2xl h-full items-center relative">
				<div className="bg-white/70 border-l border-white/70 w-screen h-[100svh] absolute top-0 -left-[1px] transform -translate-y-full" />
				<div className="bg-white/70 border-b border-white/70 w-screen absolute top-0 -bottom-[1px] right-0 transform translate-x-full" />
				{links.map(({ name, link }, i) => (
					<Link
						key={i}
						onClick={clickHandler}
						className="hidden lg:flex group font-semibold uppercase text-sm h-full px-6 p-4 justify-center items-center rounded-b-2xl transition-all duration-300
								bg-transparent hover:bg-white transform scale-100 hover:scale-110"
						href={link}>
						<div className="pointer-events-none w-full h-[100svh] transition-all duration-300 bg-transparent group-hover:bg-white absolute top-0 transform -translate-y-full" />
						<span className="transition-all duration-300 transform">{name}</span>
					</Link>
				))}
				{showAttributionInNavigation && (
					<Link
						onClick={clickHandler}
						className="hidden lg:flex group font-semibold uppercase text-sm h-full px-4 p-4 justify-center items-center rounded-b-2xl transition-all duration-300
								bg-transparent hover:bg-white transform scale-100 hover:scale-110"
						href="https://doseofted.me/"
						target="_blank"
						title="Dose of Ted">
						<div className="pointer-events-none w-full h-[100svh] transition-all duration-300 bg-transparent group-hover:bg-white absolute top-0 transform -translate-y-full" />
						<Image
							src="/prim-nav-doseofted-attribution.png"
							width={120}
							height={120}
							alt="Dose of Ted"
							className="w-auto max-h-6"
						/>
					</Link>
				)}
				{socials.map(({ icon, link, name }, i) => (
					<Link
						key={i}
						onClick={clickHandler}
						className="hidden lg:flex group font-semibold uppercase text-sm h-full px-4 p-4 justify-center items-center rounded-b-2xl
						transition-all duration-300
						bg-transparent hover:bg-white transform scale-100 hover:scale-110"
						href={link}
						target="_blank"
						title={name}>
						<div className="pointer-events-none w-full h-[100svh] transition-all duration-300 bg-transparent group-hover:bg-white absolute top-0 transform -translate-y-full" />
						<span className="transition-all duration-300 transform">
							<Icon className="w-6 h-6" icon={icon} />
							<span className="sr-only">{name}</span>
						</span>
					</Link>
				))}
				<button
					onClick={() => menuToggle(true)}
					className="flex lg:hidden group font-semibold uppercase text-sm h-full px-4 p-4 justify-center items-center rounded-b-2xl transition-all duration-300
						bg-transparent hover:bg-white transform scale-100 hover:scale-110">
					<div className="pointer-events-none w-full h-[100svh] transition-all duration-300 bg-transparent group-hover:bg-white absolute top-0 transform -translate-y-full" />
					<span className="transition-all duration-300 transform">
						<Icon className="w-6 h-6" icon="carbon:menu" />
						<span className="sr-only">Menu</span>
					</span>
				</button>
				<Modal open={menuOpen} onToggle={menuToggle}>
					<div className="flex justify-center items-start h-full w-full">
						<Dialog.Panel data-lenis-prevent className="bg-white/70 px-0 pt-12 pb-4 w-full mx-4 rounded-b-2xl">
							<div className="flex flex-col items-center justify-center">
								{links.map(({ name, link }, i) => (
									<Link
										key={i}
										onClick={clickHandler}
										className="flex justify-start items-center gap-4 w-full font-semibold uppercase text-sm h-full px-6 p-4 rounded-2xl transition-all duration-300 bg-transparent hover:bg-white transform scale-100 hover:scale-105"
										href={link}>
										<div className="w-6 h-6" />
										<span className="transition-all duration-300 transform">{name}</span>
									</Link>
								))}
								{showAttributionInNavigation && (
									<Link
										onClick={clickHandler}
										className="flex justify-start items-center gap-4 w-full font-semibold uppercase text-sm h-full px-6 p-4 rounded-2xl transition-all duration-300 bg-transparent hover:bg-white transform scale-100 hover:scale-105"
										href="https://doseofted.me/"
										target="_blank"
										title="Dose of Ted">
										<Image
											src="/prim-nav-doseofted-attribution.png"
											width={120}
											height={120}
											alt="Dose of Ted"
											className="w-auto max-h-6"
										/>
										<span className="transition-all duration-300 transform">Dose of Ted</span>
									</Link>
								)}
								{socials.map(({ name, link, icon }, i) => (
									<Link
										key={i}
										onClick={clickHandler}
										className="flex justify-start items-center gap-4 w-full font-semibold uppercase text-sm h-full px-6 p-4 rounded-2xl transition-all duration-300 bg-transparent hover:bg-white transform scale-100 hover:scale-105"
										href={link}
										target="_blank"
										title={name}>
										<Icon className="w-6 h-6" icon={icon} />
										<span className="transition-all duration-300 transform">{name}</span>
									</Link>
								))}
							</div>
						</Dialog.Panel>
					</div>
				</Modal>
			</motion.div>
		</div>
	)
}
