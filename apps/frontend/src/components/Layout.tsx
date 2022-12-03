import { Lights as LightsProvider } from "../components/Lights"

type LayoutProps = React.HTMLAttributes<HTMLDivElement>
export default function Layout(props: LayoutProps) {
	const { children, ...attrs } = props
	return (
		<div {...attrs} className={["bg-prim-space", attrs.className].join(" ")}>
			<LightsProvider options={{ size: 500 }} blur={25} saturate={1.3}>
				<div className="relative min-h-screen w-full">
					<div className="fixed container w-full h-full inset-0 mx-auto grid grid-cols-12 border-x border-white/30 px-4 gap-4 mix-blend-overlay">
						{Array.from(Array(12), (_, i) => i).map((_, index) => (
							<div key={index} className="border-x border-white/30" />
						))}
					</div>
					{children}
				</div>
			</LightsProvider>
		</div>
	)
}
