import Head from "next/head"
import { Lights } from "../components/Lights"
import { LightState } from "../components/LightsState"

export default function Home() {
	return (
		<>
			<Head>
				<title>Prim+RPC</title>
			</Head>
			<div className="font-sans flex justify-center items-center min-h-screen">
				<Lights options={{ size: 600, brightness: 1 }} blur={40}>
					<div className="flex justify-center items-center gap-12 relative top-0">
						{Array.from(Array(20), (_, i) => i).map(key => (
							<LightState state="enter" key={key}></LightState>
						))}
					</div>
				</Lights>
			</div>
		</>
	)
}
