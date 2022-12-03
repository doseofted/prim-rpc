import Head from "next/head"
import { OpinionatedLight } from "../components/LightsState"
import { Navigation } from "../components/Navigation"
import { CodeHighlighted } from "../components/CodeHighlighted"
import { motion } from "framer-motion"
import { IntroText } from "../components/IntroText"
import { GetServerSideProps } from "next"
import backend from "../client"

interface Props {
	greeting: string
}

export const getServerSideProps: GetServerSideProps<Props> = async function () {
	// NOTE: using Prim+RPC on homepage is just for fun (show fallback if server isn't running)
	let greeting = "Backend, meet Frontend."
	try {
		greeting = await backend.greetings("Backend", "Frontend")
	} catch (error) {
		/* empty */
	}
	return {
		props: { greeting },
	}
}

export default function Home({ greeting }: Props) {
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
						<div className="transform translate-x-32 mt-16">
							<div className="transform -translate-x-32">
								<motion.div
									className="mockup-code w-96 relative text-left text-xs bg-white/70 border border-white/60 backdrop-blur-lg"
									initial={{ y: 25, opacity: 0 }}
									animate={{ y: 0, opacity: 1 }}
									transition={{ duration: 0.7, delay: 0.75 }}>
									<CodeHighlighted transparent className="bg-prim-space mx-3 -mb-2 p-2 rounded-lg">
										{serverCodeSnippet}
									</CodeHighlighted>
								</motion.div>
							</div>
							<OpinionatedLight count={7} focus={0.9} size={500} state={state} />
						</div>
						<div className="transform -translate-x-32 mb-16">
							<div className="transform translate-x-32">
								<motion.div
									className="mockup-code w-96 relative text-left text-xs bg-white/70 border border-white/60 backdrop-blur-lg"
									initial={{ y: 25, opacity: 0 }}
									animate={{ y: 0, opacity: 1 }}
									transition={{ duration: 0.7, delay: 0.6 }}>
									<CodeHighlighted transparent className="bg-prim-space mx-3 -mb-2 p-2 rounded-lg">
										{clientCodeSnippet}
									</CodeHighlighted>
								</motion.div>
							</div>
							<OpinionatedLight count={7} focus={0.9} size={400} state={state} />
						</div>
					</div>
				</div>
				<div className="col-span-12">
					<p className="font-title text-[3rem] lg:text-[5.5rem] font-semibold text-white uppercase text-right leading-none">
						<IntroText delay={1.3} stagger={0.9}>
							{greeting.split(", ").map((text, i, g) => (i !== g.length - 1 ? text + ", " : text))}
						</IntroText>
					</p>
				</div>
			</div>
			{/* <div className="px-4 container mx-auto">
				<div className="grid grid-cols-12 gap-4">
					<div className="col-span-2 bg-white/70 rounded-l-3xl"></div>
					<div className="col-span-10 bg-white -ml-4 pl-4 rounded-r-3xl">
						<div className="prose">Hi</div>
					</div>
				</div>
			</div> */}
		</>
	)
}

const serverCodeSnippet = `// on server:
export function sayHello (x, y) {
  return \`\${x}, meet \${y}.\`
}`
const clientCodeSnippet = `// in browser:
const greeting = await sayHello(
  "Backend", "Frontend")
// greeting === "Backend, meet Frontend."`
