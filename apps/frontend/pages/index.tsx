import Head from "next/head"
import { PrimDocs } from "@doseofted/prim-ui/react"
import docs from "@doseofted/prim-example/dist/docs.json"
import { Light, Lights } from "../components/Lights"
// import { CtxChild, CtxTest } from "../components/CtxTest"

export default function Home() {
	return (
		<>
			<Head>
				<title>Hi</title>
			</Head>
			<div className="font-sans">
				<Lights options={{ brightness: 1, size: 500 }}>
					<Light>
						<div className="font-sans relative">
							<PrimDocs docs={docs} />
						</div>
					</Light>
				</Lights>
				{/* <CtxTest>
          <div className='h-[200vh]'>
            <CtxChild className='fixed top-0' />
          </div>
          <CtxChild />
        </CtxTest> */}
			</div>
		</>
	)
}
