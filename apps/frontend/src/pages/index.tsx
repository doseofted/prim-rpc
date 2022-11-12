import { Link } from "@solidjs/router"
import { Component, For } from "solid-js"
import { Lights } from "../components/Lights"
import { LightAuto } from "../components/LightsExtended"

const Index: Component = () => {
	return (
		<div class="bg-prim-space">
			<Lights options={{ size: 800 }}>
				<div class="relative min-h-screen w-full">
					<div class="fixed container w-full h-full inset-0 mx-auto grid grid-cols-12 border-x border-white/40 px-4 gap-4">
						<For each={new Array(12)}>{() => <div class="border-x border-white/40" />}</For>
					</div>
					<div class="relative min-h-100vh container mx-auto grid grid-cols-12 grid-rows-[auto_1fr_auto] px-4 gap-4">
						<div class="col-span-12">
							<div class="inline-block">
								<Link href="/">
									<p class="font-title text-[3rem] select-none font-400 color-prim-space uppercase">
										Prim+<span class="font-700">RPC</span>
									</p>
								</Link>

								<LightAuto />
								<LightAuto />
								<LightAuto />
								<LightAuto />
								<LightAuto />
								<LightAuto />
							</div>
						</div>
						<div class="col-span-12 font-sans text-center flex justify-center items-center text-white">
							(placeholder)
						</div>
						<div class="col-span-12">
							<p class="font-title text-[6rem] font-600 color-white uppercase text-right">
								Backend,
								<br /> Meet Frontend.
							</p>
						</div>
					</div>
				</div>
			</Lights>
		</div>
	)
}

export default Index
