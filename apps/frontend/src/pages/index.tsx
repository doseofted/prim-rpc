import Head from "next/head"
import { Lights, Light } from "../components/Lights"

export default function Home() {
	return (
		<>
			<Head>
				<title>Hi</title>
			</Head>
			<div className="font-sans flex justify-center items-center min-h-screen">
				<Lights>
					<Light>Hi</Light>
				</Lights>
			</div>
		</>
	)
}
