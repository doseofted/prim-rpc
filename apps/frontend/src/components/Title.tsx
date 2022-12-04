import Head from "next/head"

/** Title wrapper of `<title />`. Only to be used from `<Head />` as provided by Next.js */
export function Title({ title, children }: { title?: string; children?: string }) {
	const siteTitle = "Prim+RPC"
	const titleToUse = title ?? children
	return (
		<Head>
			<title>{titleToUse ? `${titleToUse} | ${siteTitle}` : siteTitle}</title>
		</Head>
	)
}
