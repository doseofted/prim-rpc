import { Component, JSX, splitProps } from "solid-js"

const ChildEvent: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	const event = (name: string) => { console.log("child", name) }
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
