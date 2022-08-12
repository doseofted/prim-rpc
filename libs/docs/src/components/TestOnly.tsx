import { Component, createSignal, JSX, splitProps } from "solid-js"
// import { styled } from "solid-styled-components"

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
	name?: string
}

const TestOnly: Component<Props> = (p) => {
	const [props, rest] = splitProps(p, ["name"])
	const [hover, setHover] = createSignal(false)
	return (
		<div
			{...rest}
			class={[rest.class, "testing-only"].join(" ")}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
		>
			This is a{hover() ? " hover" : ""} test, {props.name}
		</div>
	)
}

export default TestOnly
