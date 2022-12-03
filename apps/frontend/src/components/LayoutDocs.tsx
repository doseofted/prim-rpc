import { IntroText } from "./IntroText"

export interface DocsMeta {
	title?: string
}

type LayoutDocsProps = { meta?: DocsMeta } & React.HTMLAttributes<HTMLDivElement>

export function LayoutDocs({ meta, children }: LayoutDocsProps) {
	return (
		<>
			<div className="pointer-events-none px-4 container mx-auto relative">
				<div className="grid grid-cols-12 gap-4">
					<div className="col-span-12 min-h-[50vh] flex items-end justify-end -mt-4">
						{meta?.title && (
							<div className="pointer-events-auto">
								<h1 className="font-title text-[3rem] lg:text-[5.5rem] font-semibold text-white uppercase text-right leading-none">
									<IntroText>{meta.title.split("\n")}</IntroText>
								</h1>
							</div>
						)}
					</div>
					<div className="pointer-events-auto col-span-3 bg-white/70 -ml-4 px-4 py-8 rounded-tl-2xl">
						<ul className="space-y-8">
							<li className="space-y-2">
								<span className="font-title font-semibold">Header</span>
								<ul className="space-y-2">
									<li>Table</li>
									<li>of</li>
									<li>Contents</li>
								</ul>
							</li>
							<li className="space-y-2">
								<span className="font-title font-semibold">Header</span>
								<ul className="space-y-2">
									<li>Table</li>
									<li>of</li>
									<li>Contents</li>
								</ul>
							</li>
						</ul>
					</div>
					<div className="pointer-events-auto col-span-9 bg-white -mx-4 px-4 rounded-tr-3xl py-8 min-h-[50vh]">
						<div className="prose prose-headings:font-title">{children}</div>
					</div>
				</div>
			</div>
		</>
	)
}
