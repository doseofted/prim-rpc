import { getHighlighter, setCDN } from "shiki"

export async function highlightCode(code: string, lang = "ts") {
	setCDN("/shiki/")
	const highlighter = await getHighlighter({ theme: "bearded-theme-monokai-stone", langs: ["ts"] })
	return highlighter.codeToHtml(code, { lang })
}
highlightCode.rpc = true
