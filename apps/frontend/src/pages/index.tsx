import { Component, createEffect, createResource, createSignal } from "solid-js"
import { Title } from "@solidjs/meta"
import backend from "../client"

const App: Component = () => {
	const [typed, setTyped] = createSignal("")
	const [hello] = createResource(() => backend.sayHello({ greeting: "Hey", name: "Ted" }))
	createEffect(() => {
		if (hello.loading) { return }
		// eslint-disable-next-line solid/reactivity
		void backend.typeMessage(hello() ?? "", letter => {
			setTyped(typed().concat(letter))
		}, 100)
	})
	return <>
		<div>
			<Title>Example Broken Test</Title>

			<p>{typed()}</p>
		</div>
	</>
}

export default App
