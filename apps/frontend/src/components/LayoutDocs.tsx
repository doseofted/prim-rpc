import { Alert } from "./Alert"
import { IntroText } from "./IntroText"
import { Title } from "./Title"

export interface DocsMeta {
	title?: string
}

type LayoutDocsProps = { meta?: DocsMeta } & React.HTMLAttributes<HTMLDivElement>

export function LayoutDocs({ meta, children }: LayoutDocsProps) {
	return (
		<>
			<Title>{meta?.title}</Title>
			<div className="pointer-events-none px-4 container mx-auto relative">
				<div className="grid grid-cols-12 gap-4">
					<div className="col-span-12 min-h-[50vh] flex items-end justify-end -mt-4">
						{meta?.title && (
							<div className="pointer-events-auto">
								{/* Each documentation page has its own header so this should be a paragraph (really, it's just decoration) */}
								<p className="font-title text-[3rem] lg:text-[5.5rem] font-semibold text-white uppercase text-right leading-none">
									<IntroText>RPC Docs.</IntroText>
								</p>
							</div>
						)}
					</div>
					<div className="pointer-events-auto col-span-3 bg-white/70 text-black -ml-4 px-4 py-8 rounded-tl-2xl">
						<ul className="space-y-8">
							<li className="space-y-2">
								<span className="font-title font-semibold">Get Started</span>
								<ul className="space-y-2">
									<li>Introduction</li>
									<li>Setup</li>
									<li>Create Functions</li>
									<li>Call Functions</li>
								</ul>
							</li>
							<li className="space-y-2">
								<span className="font-title font-semibold">Usage</span>
								<ul className="space-y-2">
									<li>Simple</li>
									<li>Advanced</li>
								</ul>
							</li>
							<li className="space-y-2">
								<span className="font-title font-semibold">Build Docs</span>
								<ul className="space-y-2">
									<li>Build Time</li>
									<li>Run Time</li>
								</ul>
							</li>
							<li className="space-y-2">
								<span className="font-title font-semibold">Create a Plugin</span>
								<ul className="space-y-2">
									<li>Client</li>
									<li>Server</li>
								</ul>
							</li>
							<li className="space-y-2">
								<span className="font-title font-semibold">Example</span>
								<ul className="space-y-2">
									<li>...</li>
								</ul>
							</li>
						</ul>
					</div>
					<div className="pointer-events-auto col-span-9 bg-white -mx-4 px-4 py-8 min-h-[50vh] relative">
						<div className="bg-white w-screen h-full z-1 absolute top-0 right-0 transform translate-x-full" />
						<div className="grid grid-cols-10 gap-4 relative z-2">
							<div className="text-black col-span-10 lg:col-span-8 col-start-1 lg:col-start-2 prose min-w-full prose-headings:font-title prose-headings:font-bold prose-headings:text-black">
								<Alert icon="carbon:warning" type="alert-warning" className="mb-8">
									Prim+RPC is prerelease software. It has not reached a stable version yet and the documentation is in
									progress. Functionality may change and the library potentially be unstable.
								</Alert>
								{children}
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
