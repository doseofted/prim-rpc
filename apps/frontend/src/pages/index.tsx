import Head from "next/head"
import { Lights, Light } from "../components/Lights"

export default function Home() {
	return (
		<>
			<Head>
				<title>Hi</title>
			</Head>
			<div className="font-sans">
				<Lights>
					<Light>Hi</Light>
				</Lights>
			</div>
		</>
	)
}
