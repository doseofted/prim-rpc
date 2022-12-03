import Head from "next/head"
import Link from "next/link"
import { Lights } from "../components/Lights"
import { OpinionatedLight } from "../components/LightsState"
// import { CodeHighlighted } from "../components/CodeHighlighted"

export default function Home() {
	const state = "enter"
	return (
		<>
			<Head>
				<title>Prim+RPC</title>
			</Head>
			<div className="bg-prim-space">
				<Lights options={{ size: 500 }} blur={30} saturate={1.3}>
					<div className="relative min-h-screen w-full">
						<div className="fixed container w-full h-full inset-0 mx-auto grid grid-cols-12 border-x border-white/30 px-4 gap-4">
							{Array.from(Array(12), (_, i) => i).map((_, index) => (
								<div key={index} className="border-x border-white/30" />
							))}
						</div>
						<div className="relative min-h-screen py-8 container mx-auto grid grid-cols-12 grid-rows-[auto_1fr_auto] px-4 gap-4">
							<div className="col-span-12">
								<div className="inline-block">
									<Link href="/" className="group relative">
										<p className="font-title text-[1.5rem] lg:text-[3rem] select-none font-normal transition-[font-weight] duration-500 group-hover:font-medium text-prim-space uppercase">
											Prim+
											<span className="font-bold transition-[font-weight] delay-100 duration-500 group-hover:font-extrabold">
												RPC
											</span>
										</p>
										<OpinionatedLight count={12} state={state} />
									</Link>
								</div>
							</div>
							<div className="col-span-12 font-sans text-center flex justify-center items-center text-white">
								<div className="flex h-full w-full justify-center items-center gap-16">
									<div className="mt-16">
										<div className="mockup-code w-96 relative text-left text-xs bg-white/70 backdrop-blur-lg">
											<div className="bg-prim-space mx-3 -mb-2 p-2 rounded-lg">
												{serverCodeSnippet.split("\n").map((snippet, index) => (
													<pre className="-ml-4" key={index} data-prefix={index + 1}>
														<code>{snippet}</code>
													</pre>
												))}
											</div>
											{/* <CodeHighlighted className="bg-prim-space mx-3 -mb-2 p-2 rounded-lg">
												{serverCodeSnippet}
											</CodeHighlighted> */}
											<OpinionatedLight count={7} focus={0.9} size={400} offset={[100, 0]} state={state} />
										</div>
									</div>
									<div className="mb-16">
										<div className="mockup-code w-96 relative text-left text-xs bg-white/70 backdrop-blur-lg">
											<div className="bg-prim-space mx-3 -mb-2 p-2 rounded-lg">
												{clientCodeSnippet.split("\n").map((snippet, index) => (
													<pre className="-ml-5" key={index} data-prefix={index + 1}>
														<code>{snippet}</code>
													</pre>
												))}
											</div>
											<OpinionatedLight count={7} focus={0.9} size={300} offset={[-100, 0]} state={state} />
										</div>
									</div>
								</div>
							</div>
							<div className="col-span-12">
								<p className="font-title text-[3rem] lg:text-[5.5rem] font-semibold text-white uppercase text-right leading-tight">
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

const serverCodeSnippet = `// on server:
export function sayHello (name) {
  return \`Hello \${name}!\`
}`
const clientCodeSnippet = `// in browser:
const greeting = await sayHello("Ted")

// greeting === "Hello Ted!"`
