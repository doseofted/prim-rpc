import { Lights } from "@/components/Lights"
import { LightState } from "@/components/LightsState"
import { useControls } from "leva"
import { useMemo } from "react"

export default function Lighting() {
	const { show } = useControls({ show: true })
	const state = useMemo(() => (show ? "enter" : "exit"), [show])
	return (
		<div className="font-sans flex justify-center items-center min-h-[100svh]">
			<Lights options={{ size: 600, brightness: 1 }} blur={40}>
				<div className="flex justify-center items-center gap-12 relative top-0">
					{Array.from(Array(20), (_, i) => i).map(key => (
						<LightState state={state} key={key}></LightState>
					))}
				</div>
			</Lights>
		</div>
	)
}
