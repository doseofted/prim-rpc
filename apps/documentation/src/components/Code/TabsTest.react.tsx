import { Tabs } from "@ark-ui/react"

// Slot key names need to be named for usage in Astro
type TabsTestProps = {
	[key in `$tab${0 | 1 | 2 | 3 | 4 | 5}`]: React.ReactHTMLElement<HTMLElement>
}
type Props = TabsTestProps & {
	tabs?: { name: string; icon: string }[]
}

export function TabsTest(props: Props) {
	const { tabs: detailsTabs } = props
	const tabs: React.ReactHTMLElement<HTMLElement>[] = []
	for (const [key, value] of Object.entries(props)) {
		if (!key.startsWith("$tab")) continue
		tabs.push(value as React.ReactHTMLElement<HTMLElement>)
	}
	return (
		<Tabs.Root defaultValue={detailsTabs?.[0].name}>
			<Tabs.List className="tabs">
				{detailsTabs?.map(({ name, icon }, index) => (
					<Tabs.Trigger key={index} className={["tab tab-bordered"].join(" ")} value={name}>
						{name}
					</Tabs.Trigger>
				))}
				<Tabs.Indicator className="tab tab-bordered tab-active" />
			</Tabs.List>
			{tabs.map((tab, index) => (
				<Tabs.Content key={index} value={detailsTabs?.[index].name ?? ""}>
					{tab}
				</Tabs.Content>
			))}
		</Tabs.Root>
	)
}

export function TabItem() {}
