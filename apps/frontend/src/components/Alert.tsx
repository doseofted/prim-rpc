import { Icon } from "@iconify/react"

interface Props {
	/** Alert type as expected by DaisyUI */
	type?: "alert-info" | "alert-success" | "alert-warning" | "alert-error"
	icon?: `carbon:${string}` | `simple-icons:${string}`
	children?: React.ReactNode | React.ReactNode[]
	prose?: boolean
	className?: string
}

export function Alert(props: Props) {
	const { type = "alert-info", icon = "carbon:information", children, prose = false, className } = props
	return (
		<div className={["alert shadow-lg", className, type].join(" ")}>
			<Icon className="w-6 h-6 shrink-0 self-start mt-1" icon={icon} />
			<div className={prose ? "prose max-w-none" : "not-prose space-y-4"}>{children}</div>
		</div>
	)
}
