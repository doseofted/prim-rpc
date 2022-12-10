import { Icon } from "@iconify/react"

interface Props {
	/** Alert type as expected by DaisyUI */
	type?: "alert-info" | "alert-success" | "alert-warning" | "alert-error"
	icon?: `carbon:${string}` | `simple-icons:${string}`
	children?: React.ReactNode | React.ReactNode[]
	prose?: boolean
}

export function Alert(props: Props) {
	const { type = "alert-info", icon = "carbon:information", children, prose = false } = props
	return (
		<div className={["alert shadow-lg", type].join(" ")}>
			<div className={prose ? "prose" : "not-prose"}>
				<Icon className="w-6 h-6 flex-shrink-0 self-start mt-1" icon={icon} />
				<div className={prose ? "" : "space-y-4"}>{children}</div>
			</div>
		</div>
	)
}
