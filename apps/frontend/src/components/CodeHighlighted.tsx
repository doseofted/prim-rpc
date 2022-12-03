import { getHighlighter, setCDN } from "shiki"
import { useAsync } from "react-use"

// NOTE: doesn't work due to wasm load error (also, missing files)

interface CodeHighlightedProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: string
	code?: string
}
/** A `<div />` containing code, highlighted with Shiki */
export function CodeHighlighted(props: CodeHighlightedProps) {
	const { code, children } = props
	const toBeHighlighted = code ?? children ?? ""
	const html = useAsync(async () => {
		// FIXME: usage of CDN is only for testing
		setCDN("https://unpkg.com/shiki/")
		console.log("REMOVE UNPKG CDN LATER")
		const highlighter = await getHighlighter({ theme: "nord", langs: ["ts"] })
		const html = highlighter.codeToHtml(toBeHighlighted, { lang: "ts" })
		return { __html: html }
	})
	// return <div>{"hi"}</div>
	return <div dangerouslySetInnerHTML={html.value} />
}
