import { Icon } from "@iconify/react"
import autoAnimate from "@formkit/auto-animate"
import { useEffect, useState } from "react"

export interface CodeFileProps {
	className?: string
	filename?: string
	tabs?: string[]
	tabSelector?: string
	codeProvider?: "astro" | "rehype"
	children?: React.ReactNode
}

export function CodeFile(props: CodeFileProps) {
	const {
		className,
		filename,
		tabs = [],
		tabSelector = "[data-rehype-pretty-code-fragment]",
		codeProvider = "rehype",
		children,
	} = props
	let parentRef: HTMLElement | null = null
	const [tabsContent, setTabsContent] = useState<HTMLElement[]>([])
	// Gather possible list of tabs, if list of named tabs were given
	useEffect(() => {
		const tabsContentElements = Array.from(parentRef?.querySelectorAll<HTMLElement>(tabSelector) ?? [])
		setTabsContent(tabs.length === 0 ? [] : tabsContentElements)
		// get parent of tabsContentElements
		const parent = tabsContentElements[0]?.parentElement
		if (!parent) return
		console.log({ parent })
		autoAnimate(parent)
	}, [])
	// Show the correct tab
	useEffect(() => {
		tabsContent.map((tab, index) => (tab.style.display = index === 0 ? "" : "none"))
		setShowTab(true)
	}, [tabsContent])
	const [showTab, setShowTab] = useState(false)
	return (
		<div className={["not-prose flex flex-col rounded-xl w-full overflow-hidden", className].join(" ")}>
			{filename && (
				<div className="bg-prim-space/90 text-sm breadcrumbs text-white border-b border-white/20 px-5">
					<ul>
						{filename.split("/").map((part, index, parts) => (
							<li key={index} className="space-x-2">
								<Icon
									className="w-4 h-4 inline-block"
									icon={index !== parts.length - 1 ? "ph:folder-bold" : "ph:file-bold"}
								/>
								<span>{part}</span>
							</li>
						))}
					</ul>
				</div>
			)}
			{tabs.length > 0 && (
				<ul className="tabs bg-prim-space/90 text-sm">
					{tabs.map((tab, index) => (
						<li
							key={index}
							onClick={() =>
								tabsContent.map((given, tabIndex) => {
									console.log(given, index === tabIndex)
									given.style.display = index === tabIndex ? "block" : "none"
								})
							}
							className="tab tab-bordered text-white border-white/30">
							{tab}
						</li>
					))}
				</ul>
			)}
			<div
				ref={el => (parentRef = el)}
				className={[
					showTab ? "" : "hidden",
					"flex-grow bg-prim-space",
					codeProvider === "astro" ? "site-code-style" : "text-sm py-3 px-5 rounded-b-xl",
				].join(" ")}>
				{children}
			</div>
		</div>
	)
}
export default CodeFile
