import { IntroText } from "./IntroText"

export interface DocsMeta {
	title?: string
}

type LayoutDocsProps = { meta?: DocsMeta } & React.HTMLAttributes<HTMLDivElement>

export function LayoutDocs({ meta, children }: LayoutDocsProps) {
	return (
		<>
			<div className="px-4 container mx-auto relative">
				<div className="grid grid-cols-12 gap-4">
					<div className="col-span-12 min-h-[50vh] flex items-end justify-end -mt-4">
						{meta?.title && (
							<h1 className="font-title text-[3rem] lg:text-[5.5rem] font-semibold text-white uppercase text-right leading-none">
								<IntroText>{meta.title.split("\n")}</IntroText>
							</h1>
						)}
					</div>
					<div className="col-span-3 bg-white/70 rounded-tl-2xl"></div>
					<div className="col-span-9 bg-white -ml-4 pl-4 rounded-tr-3xl py-8 min-h-[50vh]">
						<div className="prose">{children}</div>
					</div>
				</div>
			</div>
		</>
	)
}
