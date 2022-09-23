import { Component, createEffect, createMemo, createSignal, For, lazy } from "solid-js"
import { styled, css } from "solid-styled-components"
import Docs from "./components/Docs"
import { Light } from "./components/Light"
import { useMouse, useWindowSize } from "./composables"
import { addInputFromSignal } from "./testing"

interface Props {
	hello?: string
}

const TestOnly = lazy(() => import("./components/TestOnly"))

const App: Component<Props> = (props) => {
	const { mouse, onMouseMove } = useMouse()
	const size = useWindowSize()
	const distance = createMemo(() => {
		const [centerX, centerY] = [size().width / 2, size().height / 2]
		const x = Math.pow(centerX - mouse().x, 2)
		const y = Math.pow(centerY - mouse().y, 2)
		return Math.sqrt(x + y)
	})
	const [shapeSize, setShapeSize] = createSignal(300)
	const [brightness, setBrightness] = createSignal(0.5)
	const [color, setColor] = createSignal("#52ceff")
	const [offset, setOffset] = createSignal(0)
	const [rotation, setRotation] = createSignal(0)
	const [count, setCount] = createSignal(1)
	const lightCount = createMemo(() => Array.from({ length: count() }))
	createEffect(() => {
		addInputFromSignal([count, setCount], "count", { min: 1, max: 5, step: 1 })
		addInputFromSignal([shapeSize, setShapeSize], "size", { min: 0, max: 500 })
		addInputFromSignal([brightness, setBrightness], "brightness", { min: 0, max: 1 })
		addInputFromSignal([color, setColor], "color")
		addInputFromSignal([offset, setOffset], "offset", { min: 0, max: 500 })
		addInputFromSignal([rotation, setRotation], "rotation", { min: 0, max: 360 })
	})
	return (
		<BgGray onMouseMove={onMouseMove} class="!font-mono">
			<p class={paragraph}>
				Hello {props.hello ?? "you"}.
			</p>
			<p class={paragraph}>Your mouse is at ({mouse().x}, {mouse().y})</p>
			<p class={paragraph}>From center: {Math.round(distance())}</p>
			<TestOnly class={paragraph} />
			<Docs />
			<For each={lightCount()}>{() => <Light
				brightness={brightness()}
				color={color()}
				size={shapeSize()}
				offset={offset()}
				rotation={rotation()}
			/>}</For>
		</BgGray>
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
