import { Component, createEffect, createResource, createSignal, onMount } from "solid-js"
import backend from "../client"
import { TestOnly } from "@doseofted/prim-ui"
import { ParentEvent } from "./what"

const Testing: Component = () => {
	const [typed, setTyped] = createSignal("")
	const [textInput, setTextInput] = createSignal("")
	const [name, setName] = createSignal("Ted")
	const [hello] = createResource(name, (name) => backend.sayHello({ greeting: "Hey", name }))
	createEffect(() => {
		if (hello.loading) { return }
		// eslint-disable-next-line solid/reactivity
		void backend.typeMessage(hello() ?? "", letter => {
			setTyped(typed().concat(letter))
		}, 100)
	})
	const [hover, setHover] = createSignal(false)
	// const [elem, setElem] = createSignal<HTMLDivElement>()
	// createEffect(() => {
	// 	elem()?.addEventListener("mouseenter", () => setHover(true))
	// 	elem()?.addEventListener("mouseleave", () => setHover(false))
	// })
	onMount(() => console.log())
	return <>
		<div>
			<TestOnly
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				// ref={e => setElem(e)}
				class="what"
				name="Ted"
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
			/>
			<div class="flex gap-4">
				<input
					type="text" class="border-gray border rounded-full px-6 py-1"
					value={textInput()}
					onChange={(e) => { setTextInput(e.currentTarget.value) }}
					onKeyUp={e => e.key === "Enter" ? (setName(textInput()) && setTextInput("")) : null}
				/>
				<button class="bg-gray hover:bg-light-gray px-6 py-1 rounded-full" onClick={() => setName(textInput())}>Change Text</button>
			</div>
			<p>{typed()}</p>
			<p>You are {hover() ? "" : "not"} hovering.</p>
			<p>Hello</p>
			<ParentEvent>
				<p>Outer</p>
			</ParentEvent>
		</div>
	</>
}

export default Testing
