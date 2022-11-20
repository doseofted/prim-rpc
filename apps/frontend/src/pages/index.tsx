import Head from "next/head"
import { Lights, Light } from "../components/Lights"

export default function Home() {
	return (
		<>
			<Head>
				<title>Hi</title>
			</Head>
			<div className="font-sans flex justify-center items-center min-h-[200vh]">
				<Lights options={{ size: 500 }}>
					<div className="flex justify-center items-center gap-12">
						{Array.from(Array(10), (_, i) => i).map(key => (
							<Light key={key}></Light>
						))}
					</div>
				</Lights>
			</div>
		</>
	)
}
