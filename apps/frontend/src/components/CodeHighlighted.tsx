import { getHighlighter, setCDN } from "shiki"
import { useAsync } from "react-use"

interface CodeHighlightedProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: string
	code?: string
	transparent?: boolean
}
/** A `<div />` containing code, highlighted with Shiki */
export function CodeHighlighted(props: CodeHighlightedProps) {
	const { code, children, transparent = false, ...attrs } = props
	const toBeHighlighted = code ?? children ?? ""
	const html = useAsync(async () => {
		setCDN("/shiki/")
		const highlighter = await getHighlighter({ theme: "bearded-theme-monokai-stone", langs: ["ts"] })
		const html = highlighter.codeToHtml(toBeHighlighted, { lang: "ts" })
		return { __html: transparent ? html.replace(/style="background-color: ?#\w{1,}"/, "") : html }
	}, [toBeHighlighted, transparent])
	return (
		<>
			{!html.loading ? (
				<div
					{...attrs}
					className={[attrs.className, "mx-3 -mb-2 rounded-lg overflow-hidden"].join(" ")}
					dangerouslySetInnerHTML={html.value}
				/>
			) : (
				<div {...attrs} className={[attrs.className].join(" ")}>
					<pre className="shiki opacity-50">
						<code>{toBeHighlighted}</code>
					</pre>
				</div>
			)}
		</>
	)
}
