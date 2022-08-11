import { styled } from "solid-styled-components"

function TestOnly () {
	const Div = styled("div")`
		color: white;
	`
	return <Div>This is a test</Div>
}

export default TestOnly
