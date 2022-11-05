import { Component } from "solid-js"
import backend from "../client"

const App: Component = () => {
	async function submitForm(event: Event & { currentTarget: HTMLFormElement }) {
		event.preventDefault()
		const profile = await backend.handleForm(event.currentTarget)
		console.log("Server response:", profile)
	}
	return (
		<div class="w-full h-100vh flex items-center justify-center bg-black bg-gradient-to-b from-#00080d to-#082d41">
			<form class="w-full max-w-xl p-8 bg-white rounded-lg space-y-6 flex flex-col m-2" onSubmit={e => void submitForm(e)}>
				<h1 class="text-xl font-bold">A Form</h1>
				<p>This is a form.</p>
				<div class="grid grid-cols-2 auto-cols-auto gap-4">
					<label for="name" class="max-w-12">Name</label>
					<input class="border border-black rounded-full px-2 py-1" type="text" id="name" name="name" />
				</div>
				<div class="grid grid-cols-2 auto-cols-auto gap-4">
					<label for="range" class="max-w-12">Name</label>
					<input class="border border-black rounded-full px-2 py-1" type="range" min="0" max="100" id="range" name="range" />
				</div>
				{/* <div class="grid grid-cols-2 auto-cols-auto gap-4">
					<label for="picture" class="max-w-12">Picture</label>
					<input class="border border-black rounded-full px-2 py-1" type="file" id="picture" name="picture" />
				</div> */}
				<input type="submit" class="border border-black rounded-full px-6 py-2 self-end">Submit</input>
			</form>
		</div>
	)
}

export default App
