import { random } from "lodash-es"
import Head from "next/head"
import Link from "next/link"
import { useMemo } from "react"
import { Lights, Light as LightBasic, LightOptions } from "../components/Lights"
import { LightState } from "../components/LightsState"

export default function Home() {
	const animatedLights = true
	const Light = animatedLights ? LightState : LightBasic
	console.log(random(false))
	const randomNegative = () => (random(false) === 0 ? -1 : 1)
	const logoIlluminated = useMemo<Partial<LightOptions>[]>(
		() =>
			Array.from(Array(12), (_, i) => ({
				brightness: i % 3 === 0 ? random(1.1, 1.3) : random(0.7, 1.1),
				offset:
					i % 3 === 0
						? [random(75, 150) * randomNegative(), random(75, 150) * randomNegative()]
						: [random(-50, 50), random(-50, 50)],
				delay: random(40, 60),
				rotate: random(0, 360),
				size: i % 3 === 0 ? random(400, 500) : random(200, 400),
			})),
		[]
	)
	return (
		<>
			<Head>
				<title>Prim+RPC</title>
			</Head>
			<div className="bg-prim-space">
				<Lights options={{ size: 500 }} blur={30} saturate={1.3}>
					<div className="relative min-h-screen w-full">
						<div className="fixed container w-full h-full inset-0 mx-auto grid grid-cols-12 border-x border-white/30 px-4 gap-4">
							{Array.from(Array(12), (_, i) => i).map((_, index) => (
								<div key={index} className="border-x border-white/30" />
							))}
						</div>
						<div className="relative min-h-screen py-8 container mx-auto grid grid-cols-12 grid-rows-[auto_1fr_auto] px-4 gap-4">
							<div className="col-span-12">
								<div className="inline-block">
									<Link href="/" className="group relative">
										<p className="font-title text-[1.5rem] lg:text-[3rem] select-none font-normal transition-[font-weight] duration-500 group-hover:font-medium text-prim-space uppercase">
											Prim+
											<span className="font-bold transition-[font-weight] delay-100 duration-500 group-hover:font-extrabold">
												RPC
											</span>
										</p>
										{logoIlluminated.map((light, index) => (
											<Light
												key={index}
												state="enter"
												className="absolute inset-0 pointer-events-none"
												options={light}
											/>
										))}
									</Link>
								</div>
							</div>
							<div className="col-span-12 font-sans text-center flex justify-center items-center text-white">
								<div className="flex h-full w-full justify-center items-center gap-16">
									<Light className="mt-16" options={{ brightness: 1.3, size: 400 }}>
										<div className="mockup-code bg-white/80 backdrop-blur-lg">
											<div className="bg-prim-space mx-3 -mb-2 p-2 rounded-lg">
												<pre>
													<code>// server javascript here...</code>
												</pre>
											</div>
										</div>
									</Light>
									<Light className="mb-16" options={{ brightness: 1.3, size: 400 }}>
										<div className="mockup-code bg-white/80 backdrop-blur-lg">
											<div className="bg-prim-space mx-3 -mb-2 p-2 rounded-lg">
												<pre>
													<code>// client javascript here...</code>
												</pre>
											</div>
										</div>
									</Light>
								</div>
							</div>
							<div className="col-span-12">
								<p className="font-title text-[3rem] lg:text-[6rem] font-semibold text-white uppercase text-right leading-tight">
									Backend,
									<br /> Meet Frontend.
								</p>
							</div>
						</div>
					</div>
				</Lights>
			</div>
		</>
	)
}
