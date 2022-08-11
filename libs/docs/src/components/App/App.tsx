import { Component, createMemo, JSX, lazy } from "solid-js"
import { styled, css } from "solid-styled-components"
import { useMouse, useWindowSize } from "../../composables"

interface Props {
	hello?: string
}

const TestOnly = lazy(() => import("./TestOnly"))

const App: Component<Props> = (props) => {
	const { mouse, onMouseMove } = useMouse()
	const size = useWindowSize()
	const distance = createMemo(() => {
		const [centerX, centerY] = [size().width / 2, size().height / 2]
		const x = Math.pow(centerX - mouse().x, 2)
		const y = Math.pow(centerY - mouse().y, 2)
		return Math.sqrt(x + y)
	})
	return (
		<BgGray onMouseMove={onMouseMove} class="font-mono">
			<p class={paragraph}>
				Hello {props.hello ?? "you"}.
			</p>
			<p class={paragraph}>Your mouse is at ({mouse().x}, {mouse().y})</p>
			<p class={paragraph}>From center: {Math.round(distance())}</p>
			<TestOnly />
		</BgGray> as JSX.Element
	)
}

const BgGray = styled("div")`
	background-color: rgba(0,0,0,1);
	height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	gap: 1rem;
	font-family: sans-serif;
`
const paragraph = css`
	margin: 0;
	color: white;
`

export default App
