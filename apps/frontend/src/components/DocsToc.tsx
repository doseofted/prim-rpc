import Link from "next/link"

interface Props {
	onLinkClicked?: () => void
}
export function DocsTableOfContents(props: Props) {
	const tableOfContents = [
		{
			name: "Getting Started",
			sections: [
				{ name: "Introduction", link: "/" },
				{ name: "Setup", link: "/setup" },
				{ name: "Usage", link: "/usage" },
				{ name: "Security", link: "/security" },
				{ name: "Examples", link: "/examples" },
				{ name: "Comparisons", link: "/comparisons" },
				{ name: "Limitations", link: "/limitations" },
			],
		},
		{
			name: "Reference",
			sections: [
				{ name: "Configuration", link: "/reference/configuration" },
				{ name: "RPC Structure", link: "/reference/structure" },
				{ name: "Additional Tools", link: "/reference/tooling" },
			],
		},
		{
			name: "Integrations",
			sections: [
				{ name: "Server Plugins", link: "/plugins/server" },
				{ name: "Client Plugins", link: "/plugins/client" },
				{ name: "IPC Plugins", link: "/plugins/ipc" },
				{ name: "Create Your Own", link: "/plugins/create" },
			],
		},
	]
	return (
		<ul className="space-y-8">
			{tableOfContents.map(({ name, sections }) => (
				<li key={name} className="space-y-2">
					<span className="font-title font-semibold">{name}</span>
					<ul className="space-y-2">
						{sections.map(({ name, link }) => (
							<li key={link}>
								<Link
									href={`/docs${link}`}
									onClick={() => {
										props.onLinkClicked?.()
									}}>
									{name}
								</Link>
							</li>
						))}
					</ul>
				</li>
			))}
		</ul>
	)
}
