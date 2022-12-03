import Head from "next/head"
import { OpinionatedLight } from "../components/LightsState"
import { Navigation } from "../components/Navigation"
import { CodeHighlighted } from "../components/CodeHighlighted"

export default function Home() {
	const state = "enter"
	return (
		<>
			<Head>
				<title>Prim+RPC</title>
			</Head>
			<div className="relative min-h-screen py-8 container mx-auto grid grid-cols-12 grid-rows-[auto_1fr_auto] px-4 gap-4">
				<Navigation className="col-span-12" />
				<div className="col-span-12 font-sans text-center flex justify-center items-center text-white">
					<div className="flex h-full w-full justify-center items-center gap-16">
						<div className="mt-16">
							<div className="mockup-code w-96 relative text-left text-xs bg-white/70 backdrop-blur-lg">
								<CodeHighlighted className="bg-prim-space mx-3 -mb-2 p-2 rounded-lg">
									{serverCodeSnippet}
								</CodeHighlighted>
								<OpinionatedLight count={7} focus={0.9} size={400} offset={[100, 0]} state={state} />
							</div>
						</div>
						<div className="mb-16">
							<div className="mockup-code w-96 relative text-left text-xs bg-white/70 backdrop-blur-lg">
								<CodeHighlighted className="bg-prim-space mx-3 -mb-2 p-2 rounded-lg">
									{clientCodeSnippet}
								</CodeHighlighted>
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
			<div className="h-screen"></div>
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
