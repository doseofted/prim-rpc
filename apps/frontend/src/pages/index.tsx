import Head from "next/head"
import Link from "next/link"
import { Lights } from "../components/Lights"
import { LightState } from "../components/LightsState"

export default function Home() {
	return (
		<>
			<Head>
				<title>Lights Test</title>
			</Head>
			<div className="bg-prim-space">
				<Lights options={{ size: 800 }}>
					<div className="relative min-h-screen w-full">
						<div className="fixed container w-full h-full inset-0 mx-auto grid grid-cols-12 border-x border-white/40 px-4 gap-4">
							{Array.from(Array(12), (_, i) => i).map((_, index) => (
								<div key={index} className="border-x border-white/40" />
							))}
						</div>
						<div className="relative min-h-screen container mx-auto grid grid-cols-12 grid-rows-[auto_1fr_auto] px-4 gap-4">
							<div className="col-span-12">
								<div className="inline-block">
									<Link href="/">
										<p className="font-title text-[3rem] select-none font-normal text-prim-space uppercase">
											Prim+<span className="font-bold">RPC</span>
										</p>
									</Link>
									<LightState state="enter" />
								</div>
							</div>
							<div className="col-span-12 font-sans text-center flex justify-center items-center text-white">
								(placeholder)
							</div>
							<div className="col-span-12">
								<p className="font-title text-[6rem] font-semibold text-white uppercase text-right">
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
