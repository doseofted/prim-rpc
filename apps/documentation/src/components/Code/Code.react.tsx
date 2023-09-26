interface Props {
	/** "astro" is generally used in components, "rehype" always from mdx (the default) */
	provider?: "astro" | "rehype"
	classOverride?: string
}

export function Code(props: Props) {
	const { provider = "rehype", classOverride } = props
	return (
		<div
			className={[
				"bg-prim-space",
				provider === "astro" ? "site-code-style" : "text-sm py-3 px-5 rounded-b-xl",
				classOverride,
			].join(" ")}>
			<slot />
		</div>
	)
}
export default Code
