import { OpinionatedLight } from "@/components/LightsState"
import { Navigation } from "@/components/Navigation"
import { CodeHighlighted } from "@/components/CodeHighlighted"
import { motion } from "framer-motion"
import { IntroText } from "@/components/IntroText"
import { GetStaticProps } from "next"
import { Title } from "@/components/Title"
import { NextSeo } from "next-seo"
import Link from "next/link"
import { Icon } from "@iconify/react"
import backend from "../app/prim/client"

interface Props {
	greeting: string
}

export const getStaticProps: GetStaticProps<Props> = async function () {
	const props = { greeting: "" }
	try {
		props.greeting = await backend.greetings("Backend", "Frontend")
	} catch (error) {
		console.debug(error)
		props.greeting = "Backend, meet Frontend."
	}
	// documentation site is basically static other than example RPC usage (only call once per day)
	return { props, revalidate: 60 * 60 * 24 }
}

export default function Home({ greeting }: Props) {
	const state = "enter"
	const commonSeo = {
		title: "Prim+RPC",
		description:
			"Easy-to-understand, type-safe, transport-agnostic RPC/IPC for JavaScript, supporting callbacks, batching, file uploads, custom serialization, and more.",
	}
	const features = [
		{
			title: "It's Just JavaScript",
			details:
				"If you know JavaScript basics then you know how to use Prim+RPC. Great for beginners and experts alike.",
		},
		{
			title: "No Guessing: It's Fully Typed",
			details:
				"When you use TypeScript you get full type definitions in your client. Not using TypeScript? Get typed results with JSDoc using plain JavaScript.",
		},
		{
			title: "Zero Client Generation",
			details:
				"You don't have to compile an API client with Prim+RPC: instead it's determined at runtime based on the functions that you call.",
		},
		{
			title: "Bring Your Own Server",
			details:
				"Prim+RPC is built to be framework-agnostic. It can support the server you're already using through the use of plugins.",
		},
		{
			title: "Choose Your Client",
			details:
				"Not only can you use the server of your choice but you can use your favorite HTTP client by creating a plugin in Prim+RPC.",
		},
		{
			title: "It's Transport-Agnostic",
			details:
				"Prim+RPC can bridge any gap between two JavaScript environments: not just HTTP. Bridge processes, Web Workers, and more.",
		},
		{
			title: "Upload Files",
			details: "You can upload a file in Prim+RPC by simply passing a file as an argument to your function.",
		},
		{
			title: "Use Your Callbacks",
			details:
				"By using a callback on your function, you can receive events from your server on the client without all of the setup!",
		},
		{
			title: "Advanced Types Supported",
			details:
				"Prim+RPC can send advanced structures like Dates, RegExps, Errors, and more by using a custom JSON handler.",
		},
		{
			title: "Throw Errors on Server and Client",
			details: "Errors thrown on the server get thrown on the client. Try / catch is your friend here.",
		},
		{
			title: "Upload Forms Easily",
			details:
				"Pass your form directly to the Prim+RPC client and receive all fields, including files, on the server. No additional form processing.",
		},
		{
			title: "Share It with the World",
			details:
				"You can use Prim+RPC either privately in a single project or share your API with the world by hosting and publishing your types to a private/public registry.",
		},
		{
			title: "Batch RPCs",
			details:
				"When you call many functions at once using the Prim+RPC client, they can be combined into a single request automatically.",
		},
		{
			title: "Share Only What's Allowed",
			details:
				"As a security precaution, only the functions you explicitly mark as RPC will be callable from Prim+RPC.",
		},
		{
			title: "Generate Documentation",
			details:
				"Prim+RPC can generate RPC-specific documentation from your code's TypeDoc documentation. Build your own documentation website how you want.",
		},
	]
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
							url: `https://${process.env.NEXT_PUBLIC_WEBSITE_HOST}/social.png`,
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
							<OpinionatedLight count={4} focus={0.9} size={500} state={state} />
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
							<OpinionatedLight count={4} focus={0.9} size={500} state={state} />
						</div>
					</div>
				</div>
				<div className="col-span-12">
					<p className="font-title text-[2.3rem] sm:text-[3rem] lg:text-[5.5rem] font-semibold text-white uppercase text-right leading-none">
						<IntroText delay={1.3} stagger={0.9}>
							{greeting.split(", ").map((text, i, g) => (i !== g.length - 1 ? text + ", " : text))}
						</IntroText>
					</p>
					<div className="flex justify-end">
						<motion.div animate={{ opacity: [0, 1] }} transition={{ delay: 3.5 }} className="w-6 h-6">
							<motion.div
								animate={{ y: [0, 10, 0] }}
								transition={{
									repeat: Infinity,
									repeatType: "loop",
									duration: 1.5,
									easings: ["circOut", "circIn"],
								}}>
								<Icon className="w-6 h-6 text-white" icon="carbon:chevron-down" />
							</motion.div>
						</motion.div>
					</div>
				</div>
			</div>
			<div className="relative py-8 container mx-auto grid grid-cols-12 px-4 gap-4">
				<div className="col-span-12 lg:col-span-6 text-white space-y-4">
					<p className="font-title text-xl sm:text-2xl lg:text-4xl font-semibold uppercase leading-none">
						RPC for the Rest&nbsp;of&nbsp;Us.
					</p>
					<p className="text-sm lg:text-base">
						Prim+RPC bridges incompatible JavaScript environments. Call a JavaScript function on the server remotely as
						if it was defined on the client itself.
					</p>
				</div>
			</div>
			<div className="relative container mx-auto grid grid-cols-12 px-4 gap-4">
				{features.slice(0, 6).map(({ title, details }, key) => (
					<div
						key={key}
						className="relative bg-white/70 rounded-lg border border-white/60 backdrop-blur-lg p-4 col-span-12 md:col-span-4 text-prim-space space-y-4">
						<p className="font-bold">{title}</p>
						<p className="text-sm lg:text-base">{details}</p>
						<OpinionatedLight count={2} focus={0.9} size={500} state={state} className="top-0 left-0 absolute" />
					</div>
				))}
			</div>
			<div className="relative pt-32 container mx-auto grid grid-cols-12 px-4 gap-4">
				<div className="relative bg-white/70 rounded-lg border border-white/60 backdrop-blur-lg p-4 col-span-12 text-prim-space space-y-4">
					<div className="lg:w-1/2 space-y-4">
						<p className="font-title text-xl sm:text-2xl lg:text-4xl font-semibold uppercase leading-none">
							Write A Function. Call&nbsp;It.&nbsp;Done.
						</p>
						<p className="text-xs lg:text-base">
							With Prim+RPC, you can write regular JavaScript on a server and expose it for some client to use.
							Communicate between frontend/backend, browser/worker, and more. Easily.
						</p>
					</div>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<div className="flex flex-col">
							<div className="tabs relative top-[1px]">
								<div className="tab tab-md border-transparent tab-lifted" />
								<div className="tab tab-md tab-lifted tab-active">server.ts</div>
								<div className="tab tab-md border-transparent tab-lifted" />
								<OpinionatedLight count={2} focus={0.9} size={700} state={state} />
							</div>
							<div className="bg-white border border-gray-300 p-3 rounded-xl flex-grow">
								<CodeHighlighted
									transparent
									className="h-full text-xs lg:text-sm bg-prim-space p-3 rounded-lg overflow-x-auto">
									{serverExampleCode}
								</CodeHighlighted>
							</div>
						</div>
						<div className="flex flex-col">
							<div className="tabs relative top-[1px]">
								<div className="tab tab-md border-transparent tab-lifted" />
								<div className="tab tab-md tab-lifted tab-active">client.ts</div>
								<div className="tab tab-md border-transparent tab-lifted" />
								<OpinionatedLight count={2} focus={0.9} size={700} state={state} />
							</div>
							<div className="bg-white border border-gray-300 p-3 rounded-xl flex-grow">
								<CodeHighlighted
									transparent
									className="h-full text-xs lg:text-sm bg-prim-space p-3 rounded-lg overflow-x-auto">
									{clientExampleCode}
								</CodeHighlighted>
							</div>
						</div>
					</div>
					<div className="lg:w-1/2 space-y-4">
						<p className="text-xs lg:text-base">
							You can choose your own server, client, transport, JSON handler, and more with Prim+RPC. See the available
							integrations in the documentation or try out an example.
						</p>
						<div className="flex gap-4">
							<Link href="/docs/examples" className="btn btn-neutral text-white">
								<Icon className="w-6 h-6" icon="carbon:terminal-3270" />
								Try an Example
							</Link>
							<Link href="/docs" className="btn btn-neutral text-white">
								<Icon className="w-6 h-6" icon="carbon:notebook-reference" />
								Documentation
							</Link>
						</div>
					</div>
				</div>
			</div>
			<div className="relative pt-32 py-8 container mx-auto grid grid-cols-12 px-4 gap-4">
				<div className="col-span-12 lg:col-span-6 text-white space-y-4">
					<p className="font-title text-xl sm:text-2xl lg:text-4xl font-semibold uppercase leading-none">
						Oh, But That's Not All.
					</p>
				</div>
			</div>
			<div className="relative container mx-auto grid grid-cols-12 px-4 gap-4">
				{features.slice(6).map(({ title, details }, key) => (
					<div
						key={key}
						className="relative bg-white/70 rounded-lg border border-white/60 backdrop-blur-lg p-4 col-span-12 md:col-span-4 text-prim-space space-y-4">
						<p className="font-bold">{title}</p>
						<p className="text-sm lg:text-base">{details}</p>
						<OpinionatedLight count={1} focus={0.9} size={500} state={state} className="bottom-0 right-0 absolute" />
					</div>
				))}
			</div>
			<div className="relative pt-32 pb-8 container mx-auto grid grid-cols-12 px-4 gap-4">
				<div className="col-span-12 text-white space-y-4 text-center">
					<p className="font-title text-xl sm:text-2xl lg:text-4xl font-semibold uppercase leading-none">
						It's Available Now. Like, Right Now.
					</p>
					<div className="flex flex-wrap lg:flex-nowrap justify-center mx-auto gap-4">
						<Link href="/docs" className="btn glass hover:bg-neutral text-white">
							<Icon className="w-6 h-6" icon="carbon:notebook-reference" />
							Get Started
						</Link>
						<Link href="/docs/examples" className="btn glass hover:bg-neutral text-white">
							<Icon className="w-6 h-6" icon="carbon:terminal-3270" />
							Try An Example
						</Link>
						<Link href="/docs/usage" className="btn glass hover:bg-neutral text-white">
							<Icon className="w-6 h-6" icon="carbon:idea" />
							Learn to Use
						</Link>
						<div className="w-full block lg:hidden" />
						<Link href="/docs/plugins/create" className="btn glass hover:bg-neutral text-white">
							<Icon className="w-6 h-6" icon="carbon:plug" />
							Plugins
						</Link>
					</div>
				</div>
			</div>
		</>
	)
}

const serverCodeSnippet = `// on server:
export function sayHello (x, y) {
  return \`\${x}, meet \${y}.\`
}
sayHello.rpc = true`
const clientCodeSnippet = `// on client:
const hello = await sayHello(
  "Backend", "Frontend"
)
console.log(hello)`

const serverExampleCode = `import { createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler } from "@doseofted/prim-rpc-plugins/fastify"
import Fastify from "fastify"

// write your functions
function hello (name?: string) {
	return \`Hello \${name ?? "you"}!\`
}
hello.rpc = true
const module = { hello }

// setup your favorite server
const fastify = Fastify()
const methodHandler = createMethodHandler({ fastify })
createPrimServer({ module, methodHandler })
fastify.listen({ port: 80 })
console.log("Serving Prim+RPC: http://website.localhost/prim")

// optionally, export types
export type { module }
`

const clientExampleCode = `import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin } from "@doseofted/prim-rpc-plugins/browser"
import type { module } from "./server"

// set up your client (zero client generation)
const client = createPrimClient<typeof module>({
	endpoint: "http://website.localhost/prim",
	methodPlugin: createMethodPlugin()
})

// call your functions
const greeting = await client.hello()
console.log(greeting) // "Hello you!"
`
