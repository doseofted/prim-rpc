import { createSignal } from "solid-js"
import { styled } from "solid-styled-components"

function TestOnly() {
	const [hover, setHover] = createSignal(false)
	return (
		<Div
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
		>
			This is a{hover() ? " hover" : ""} test
		</Div>
	)
}

const Div = styled("div")`
	color: white;
`

export default TestOnly
