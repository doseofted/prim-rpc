import { Component, JSX, splitProps } from "solid-js"
import { styled } from "solid-styled-components"

const ChildEvent: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	const event = (name: string) => { console.log("child", name) }
	// NOTE: if StyledDiv is used instead of native JSX element, parent events are not fired
	const StyledDiv = styled("div")`
		color: red;
	`
	return <div {...props} onMouseEnter={[event, "enter"]} onMouseLeave={[event, "leave"]} />
}

const ParentEvent: Component<JSX.HTMLAttributes<HTMLDivElement>> = (p) => {
	const [childProps, props] = splitProps(p, ["children"])
	const event = (name: string) => { console.log("parent", name) }
	return <ChildEvent {...props} onMouseEnter={[event, "enter"]} onMouseLeave={[event, "leave"]}>
		<div>Parent</div>
		<div {...childProps} />
	</ChildEvent>
}

export { ChildEvent, ParentEvent }
