import Head from "next/head"
import Link from "next/link"
import { Lights, defaultColors, NamedColor, Light as LightBasic, LightOptions } from "../components/Lights"
import { LightState } from "../components/LightsState"

export default function Home() {
	const animatedLights = true
	const Light = animatedLights ? LightState : LightBasic
	return (
		<>
			<Head>
				<title>Prim+RPC</title>
			</Head>
			<div className="bg-prim-space">
				<Lights options={{ size: 800 }} blur={30}>
					<div className="relative min-h-screen w-full">
						<div className="fixed container w-full h-full inset-0 mx-auto grid grid-cols-12 border-x border-white/40 px-4 gap-4">
							{Array.from(Array(12), (_, i) => i).map((_, index) => (
								<div key={index} className="border-x border-white/40" />
							))}
						</div>
						<div className="relative min-h-screen py-8 container mx-auto grid grid-cols-12 grid-rows-[auto_1fr_auto] px-4 gap-4">
							<div className="col-span-12">
								<div className="inline-block">
									<Link href="/" className="relative">
										<p className="font-title text-[3rem] select-none font-normal text-prim-space uppercase">
											Prim+<span className="font-bold">RPC</span>
										</p>
										{logoLights.map((light, index) => (
											<Light key={index} state="enter" className="absolute inset-0" options={light} />
										))}
									</Link>
								</div>
							</div>
							<div className="col-span-12 font-sans text-center flex justify-center items-center text-white">
								(placeholder)
							</div>
							<div className="col-span-12">
								<p className="font-title text-[6rem] font-semibold text-white uppercase text-right leading-tight">
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

const logoLights: LightOptions[] = [
	{
		brightness: 2,
		color: defaultColors[NamedColor.ElectricBlue],
		size: 300,
		offset: [0, 0],
	},
	{
		brightness: 1.4,
		color: defaultColors[NamedColor.BlueJeans],
		size: 600,
		offset: [0, 50],
	},
	{
		brightness: 1,
		color: defaultColors[NamedColor.BlueJeans],
		size: 400,
		offset: [0, 250],
	},
	{
		brightness: 1.4,
		color: defaultColors[NamedColor.ElectricBlue],
		size: 300,
		offset: [0, 300],
	},
	{
		brightness: 1.5,
		color: defaultColors[NamedColor.Mauve],
		size: 300,
		offset: [250, 0],
	},
	{
		brightness: 1.3,
		color: defaultColors[NamedColor.Mauve],
		size: 400,
		offset: [300, 100],
	},
]
