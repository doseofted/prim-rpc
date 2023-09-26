import { Tabs } from "@ark-ui/react"
import { Icon } from "@iconify/react"

// Slot key names need to be named for usage in Astro
type CodeTabsList = {
	[key in `$tab${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`]: React.ReactHTMLElement<HTMLElement>
}
export type CodeTabsProps = CodeTabsList & {
	details?: { name: string; icon: string }[]
	className?: string
}

export function CodeTabs(props: CodeTabsProps) {
	const { details, className } = props
	const tabs = Object.entries(props)
		.filter(([key]) => key.startsWith("$tab"))
		.sort((a, b) => (a[0] > b[0] ? 1 : -1))
		.map(([_, tab]) => tab as React.ReactHTMLElement<HTMLElement>)
	return (
		<Tabs.Root
			className={["not-prose flex flex-col rounded-xl w-full overflow-hidden relative", className].join(" ")}
			defaultValue={details?.[0].name}>
			<Tabs.List className="tabs flex-nowrap overflow-x-auto bg-prim-space/90 text-sm">
				{details?.map(({ name, icon }, index) => (
					<Tabs.Trigger
						key={index}
						className={["tab flex-nowrap tab-bordered gap-2 text-white/90 border-white/10"].join(" ")}
						value={name}>
						<Icon icon={icon} />
						<span>{name}</span>
					</Tabs.Trigger>
				))}
				<Tabs.Indicator className="tab tab-bordered tab-active text-white !border-white/70" />
			</Tabs.List>
			{tabs.map((tab, index) => (
				<Tabs.Content key={index} value={details?.[index].name ?? ""}>
					{tab}
				</Tabs.Content>
			))}
		</Tabs.Root>
	)
}
export default CodeTabs
