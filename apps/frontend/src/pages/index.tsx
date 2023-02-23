import { OpinionatedLight } from "@/components/LightsState"
import { Navigation } from "@/components/Navigation"
import { CodeHighlighted } from "@/components/CodeHighlighted"
import { motion } from "framer-motion"
import { IntroText } from "@/components/IntroText"
import { GetServerSideProps } from "next"
import backend from "../prim-client"
import { Title } from "@/components/Title"
import { NextSeo } from "next-seo"

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
	const commonSeo = {
		title: "Prim+RPC",
		description:
			"Easy-to-understand, type-safe, transport-agnostic RPC/IPC for JavaScript, supporting callbacks, batching, file uploads, custom serialization, and more.",
	}
	return (
		<>
			<Title />
			<NextSeo
				{...commonSeo}
				twitter={{ handle: "@doseofted", cardType: "summary_large_image" }}
				openGraph={{
					...commonSeo,
					images: [
						{
							url: `${process.env.NEXT_PUBLIC_WEBSITE_HOST}/social.png`,
							alt: 'Two very short JavaScript files: a simple function on the server-side and a call to that function on the client-side. Tagline: "Backend, meet Frontend"',
							width: 1200,
							height: 630,
							type: "image/png",
						},
					],
				}}
			/>
			<div className="relative min-h-[100svh] py-8 container mx-auto grid grid-cols-12 grid-rows-[auto_1fr_auto] px-4 gap-4">
				<Navigation className="col-span-12" />
				<div className="col-span-12 font-sans text-center flex justify-center items-center text-white">
					<div className="flex flex-col lg:flex-row h-full w-full justify-center items-center gap-16">
						<div className="transform translate-y-32 lg:translate-y-0 lg:translate-x-32 sm:ml-16 lg:ml-0 lg:mt-16">
							<div className="transform -translate-y-32 lg:translate-y-0 lg:-translate-x-32">
								<motion.div
									className="mockup-code w-96 relative text-left text-sm bg-white/70 border border-white/60 backdrop-blur-lg"
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
						<div className="transform -translate-y-32 lg:translate-y-0 lg:-translate-x-32 sm:mr-16 lg:mr-0 lg:mb-16">
							<div className="transform translate-y-32 lg:translate-y-0 lg:translate-x-32">
								<motion.div
									className="mockup-code w-96 relative text-left text-sm bg-white/70 border border-white/60 backdrop-blur-lg"
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
					<p className="font-title text-[2.3rem] sm:text-[3rem] lg:text-[5.5rem] font-semibold text-white uppercase text-right leading-none">
						<IntroText delay={1.3} stagger={0.9}>
							{greeting.split(", ").map((text, i, g) => (i !== g.length - 1 ? text + ", " : text))}
						</IntroText>
					</p>
				</div>
			</div>
		</>
	)
}

const serverCodeSnippet = `// on server:
export function sayHello (x, y) {
  return \`\${x}, meet \${y}.\`
}`
const clientCodeSnippet = `// in browser:
const greeting = await sayHello(
  "Backend", "Frontend"
)`
