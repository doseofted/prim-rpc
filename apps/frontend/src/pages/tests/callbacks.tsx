import { Component, createEffect, createResource, createSignal, onMount } from "solid-js"
import backend from "../../client"

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
	const [hover] = createSignal(false)
	// const [elem, setElem] = createSignal<HTMLDivElement>()
	// createEffect(() => {
	// 	elem()?.addEventListener("mouseenter", () => setHover(true))
	// 	elem()?.addEventListener("mouseleave", () => setHover(false))
	// })
	onMount(() => console.log())
	return <>
		<div>
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
		</div>
	</>
}

export default Testing
