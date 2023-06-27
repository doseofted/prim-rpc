import { useAsync, useMount } from "react-use"
import { createPrimClient, RpcModule } from "@doseofted/prim-rpc"
import { createMethodPlugin, createCallbackPlugin, jsonHandler } from "@doseofted/prim-rpc-plugins/web-worker"
import type { module } from "./worker"
import { useState } from "react"

interface CodeHighlightedProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: string
	code?: string
	transparent?: boolean
}
/** A `<div />` containing code, highlighted with Shiki */
export function CodeHighlighted(props: CodeHighlightedProps) {
	const { code, children, transparent = false, className, ...attrs } = props
	const toBeHighlighted = code ?? children ?? ""
	const [worker, setWorker] = useState<RpcModule<typeof module>>()
	useMount(() => {
		const worker = new Worker(new URL("./worker", import.meta.url), { type: "module" })
		const methodPlugin = createMethodPlugin({ worker })
		const callbackPlugin = createCallbackPlugin({ worker })
		const client = createPrimClient<typeof module>({ jsonHandler, methodPlugin, callbackPlugin })
		setWorker(client)
	})
	const html = useAsync(async () => {
		if (!worker) {
			throw new Error("Worker not ready yet")
		}
		const html = await worker.highlightCode(toBeHighlighted, "ts")
		return { __html: transparent ? html.replace(/style="background-color: ?#\w{1,}"/, "") : html }
	}, [toBeHighlighted, transparent, worker])
	return (
		<>
			{!html.error ? (
				<div {...attrs} className={[className].join(" ")} dangerouslySetInnerHTML={html.value} />
			) : (
				<div {...attrs} className={[className].join(" ")}>
					<pre className="shiki opacity-50">
						<code>{toBeHighlighted}</code>
					</pre>
				</div>
			)}
		</>
	)
}
