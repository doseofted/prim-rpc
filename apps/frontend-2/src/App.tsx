import { Component, createEffect, createResource, createSignal } from "solid-js"
import backend from "./client"

const App: Component = () => {
	const [typed, setTyped] = createSignal("")
	const [hello] = createResource(() => backend.sayHello({ name: "Ted" }))
	createEffect(() => {
		console.log("created", 3)
		if (hello.loading) { return }
		void backend.typeMessage(hello() ?? "", (letter) => {
			setTyped(typed().concat(letter))
		}, 50)
	})
	return (
		<div>
			<p>{typed()}</p>
		</div>
	)
}

export default App
