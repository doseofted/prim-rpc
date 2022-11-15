import produce from "immer"
import { createContext, useContext, useEffect, useState } from "react"
import { useWindowScroll, useWindowSize } from "react-use"

type CtxType = { winSize: { width: number, height: number }, scrollPos: { x: number, y: number } }
const testCtx = createContext<CtxType | null>(null)
function useTestCtx() {
	const ctx = useContext(testCtx)
	if (!ctx) { throw new Error("Nope") }
	return ctx
}

interface CtxTestProps {
	children?: React.ReactNode
}
export function CtxTest(props: CtxTestProps) {
	const [env, setEnv] = useState<CtxType>({
		winSize: { width: 0, height: 0 },
		scrollPos: { x: 0, y: 0 }
	})
	const winSize = useWindowSize(0, 0)
	const scrollPos = useWindowScroll()
	useEffect(() => {
		setEnv(produce((given) => {
			given.winSize = winSize
		}))
	}, [winSize])
	useEffect(() => {
		setEnv(produce((given) => {
			given.scrollPos = scrollPos
		}))
	}, [scrollPos])
	return (
		<testCtx.Provider value={env}>
			{props.children}
		</testCtx.Provider>
	)
}

interface CtxChildProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode
}
export function CtxChild({ children, ...attrs }: CtxChildProps) {
	const { scrollPos, winSize } = useTestCtx()
	return <div {...attrs}>
		<div>({scrollPos.x}, {scrollPos.y})</div>
		<div>({winSize.width}, {winSize.height})</div>
		{children}
	</div>
}