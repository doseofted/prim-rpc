import { Tabs } from "@ark-ui/react"

// Slot key names need to be named for usage in Astro
type TabsTestProps = {
	[key in `tab${0 | 1 | 2 | 3 | 4 | 5}`]: React.ReactHTMLElement<HTMLElement>
}

export function TabsTest(props: TabsTestProps) {
	const tabs: React.ReactHTMLElement<HTMLElement>[] = []
	for (const [key, value] of Object.entries(props)) {
		if (!key.startsWith("tab")) continue
		tabs.push(value)
	}
	return (
		<Tabs.Root defaultValue="react">
			<Tabs.List>
				<Tabs.Trigger value="react">React</Tabs.Trigger>
				<Tabs.Trigger value="vue">Vue</Tabs.Trigger>
				<Tabs.Trigger value="solid">Solid</Tabs.Trigger>
				<Tabs.Indicator />
			</Tabs.List>
			{tabs.map(tab => {
				console.log(tab.props.value)
				return <Tabs.Content value="react">{tab}</Tabs.Content>
			})}
		</Tabs.Root>
	)
}

export function TabItem() {}
