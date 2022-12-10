import { Lights, Light } from "@/components/Lights"
import { useControls } from "leva"

export default function LightsPage() {
	const { size, blur, count, brightness, offset, rotate, delay } = useControls({
		count: { step: 1, value: 5, min: 0 },
		blur: { value: 40, min: 0, max: 100 },
		size: { value: 600, min: 0, max: 1000 },
		brightness: { value: 1, min: 0, max: 2 },
		offset: { value: [0, 0], x: { min: -250, max: 250 }, y: { min: -250, max: 250 } },
		rotate: { value: 0, min: 0, max: 359 },
		delay: { value: 50, min: 0, max: 100 },
	})
	return (
		<div className="font-sans flex justify-center items-center min-h-screen">
			<Lights blur={blur}>
				<div className="flex flex-wrap justify-center items-center gap-12 relative top-0">
					{Array.from(Array(count), (_, i) => i).map(key => (
						<Light
							options={{ size, brightness, offset, rotate, delay }}
							key={key}
							className="w-4 h-4 bg-white rounded-full"
						/>
					))}
				</div>
			</Lights>
		</div>
	)
}
