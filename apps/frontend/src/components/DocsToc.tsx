import Link from "next/link"
import { useRouter } from "next/router"

interface Props extends React.HTMLAttributes<HTMLDivElement> {
	onLinkClicked?: () => void
}
export function DocsTableOfContents(props: Props) {
	const route = useRouter()
	const tableOfContents = [
		{
			name: "Getting Started",
			sections: [
				{ name: "Introduction", link: "/" },
				{ name: "Setup", link: "/setup" },
				{ name: "Examples", link: "/examples" },
				{ name: "Features", link: "/features" },
				{ name: "Security", link: "/security" },
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
		<ul className={["menu menu-sm px-0 space-y-4 flex-nowrap", props.className].join(" ")} data-lenis-prevent>
			{tableOfContents.map(({ name, sections }) => (
				<li key={name} className="space-y-2">
					<span className="menu-title !text-black px-0 font-title font-semibold">{name}</span>
					<ul className="ml-0 px-0 !mt-0 border-l-0">
						{sections.map(({ name, link }) => (
							<li key={link}>
								<Link
									href={`/docs${link}`}
									className={
										route.pathname === `/docs${link}` || (route.pathname === "/docs" && link === "/")
											? "active text-white"
											: ""
									}
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
