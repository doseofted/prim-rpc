import { Dialog } from "@headlessui/react"
import { Icon } from "@iconify/react"
import { useState } from "react"
import { Alert } from "@/components/Alert"
import { DocsTableOfContents } from "@/components/DocsToc"
import { IntroText } from "@/components/IntroText"
import { Modal } from "@/components/Modal"
import { Title } from "@/components/Title"

export interface DocsMeta {
	title?: string
}

type LayoutDocsProps = { meta?: DocsMeta } & React.HTMLAttributes<HTMLDivElement>

export function LayoutDocs({ meta, children }: LayoutDocsProps) {
	const [docsMenuOpen, docsMenuToggle] = useState(false)
	return (
		<>
			<Title>{meta?.title}</Title>
			<div className="pointer-events-none px-4 container mx-auto relative">
				<div className="grid grid-cols-12 gap-4">
					<div className="col-span-12 min-h-[50svh] flex items-end justify-end -mt-4">
						{meta?.title && (
							<div className="pointer-events-auto">
								{/* Each documentation page has its own header so this should be a paragraph (really, it's just decoration) */}
								<p className="font-title text-[3rem] lg:text-[5.5rem] font-semibold text-white uppercase text-right leading-none">
									<IntroText>RPC Docs.</IntroText>
								</p>
							</div>
						)}
					</div>
					<div className="hidden lg:block pointer-events-auto col-span-2 bg-white/70 text-black -ml-4 px-4 py-8 rounded-l-2xl">
						<DocsTableOfContents />
					</div>
					<div className="flex relative justify-end lg:hidden pointer-events-auto col-span-12 bg-white/70 text-black -mb-4">
						<div className="bg-white/70 w-screen h-full z-1 absolute top-0 right-0 transform translate-x-full" />
						<div className="bg-white/70 w-screen h-full z-1 absolute top-0 left-0 transform -translate-x-full" />
						<button
							onClick={() => docsMenuToggle(true)}
							className="rounded-tl-2xl p-4 flex gap-4 items-center uppercase transition-all duration-300 bg-transparent group hover:bg-white transform scale-100 hover:scale-110">
							<div className="w-screen h-full z-1 absolute top-0 right-0 transform translate-x-full transition-all duration-300 bg-transparent group-hover:bg-white" />
							<span>Table of Contents</span>
							<Icon className="w-6 h-6 flex-shrink-0 self-start" icon="carbon:table-of-contents" />
						</button>
						<Modal open={docsMenuOpen} onToggle={docsMenuToggle}>
							<div className="flex justify-center items-center h-full w-full">
								<Dialog.Panel
									data-lenis-prevent
									className="bg-white/70 p-6 py-12 rounded-2xl pr-32 max-h-[calc(100svh-4rem)] overflow-auto">
									<DocsTableOfContents onLinkClicked={() => docsMenuToggle(false)} />
								</Dialog.Panel>
							</div>
						</Modal>
					</div>
					<div className="pointer-events-auto col-span-12 lg:col-span-10 bg-white -mx-4 px-4 py-8 min-h-[50svh] relative">
						<div className="bg-white w-screen h-full z-1 absolute top-0 right-0 transform translate-x-full" />
						<div className="block lg:hidden bg-white w-screen h-full z-1 absolute top-0 left-0 transform -translate-x-full" />
						<div className="grid grid-cols-10 gap-4 relative z-2">
							<div className="text-black col-span-10 lg:col-span-8 col-start-1 lg:col-start-2 prose min-w-full prose-headings:font-title prose-headings:font-bold prose-headings:text-black prose-table:table-normal prose-table:table prose-th:text-xs prose-td:text-xs prose-table:table-zebra">
								<Alert icon="carbon:warning" type="alert-warning" className="mb-8">
									Prim+RPC is prerelease software. It may be unstable and functionality may change prior to full
									release.
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
