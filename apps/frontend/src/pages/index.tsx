import { Component, For } from "solid-js"
import backend from "../client"

const App: Component = () => {
	async function submitForm(event: Event & { currentTarget: HTMLFormElement }) {
		event.preventDefault()
		const profile = await backend.handleForm(event.currentTarget)
		console.log("Server response:", profile)
	}
	const labelClass = "max-w-12"
	const inputClass = "border border-black rounded-full px-2 py-1"
	return (
		<div class="w-full h-100vh flex items-center justify-center bg-black bg-gradient-to-b from-#00080d to-#082d41">
			<form class="w-full max-w-xl p-8 bg-white rounded-lg space-y-6 flex flex-col m-2" onSubmit={e => void submitForm(e)}>
				<h1 class="text-xl font-bold">A Form</h1>
				<p>This is a form.</p>
				{(id = "text", label = "Text") => (
					<div class="grid grid-cols-2 auto-cols-auto gap-4">
						<label for={id} class={labelClass}>{label}</label>
						<input id={id} class={inputClass} name={label.toLowerCase()} type="text" />
					</div>
				)}
				{(id = "number", label = "Number") => (
					<div class="grid grid-cols-2 auto-cols-auto gap-4">
						<label for={id} class={labelClass}>{label}</label>
						<input id={id} class={inputClass} name={label.toLowerCase()} type="range" min="0" max="100" />
					</div>
				)}
				{(id = "file", label = "File(s)") => (
					<div class="grid grid-cols-2 auto-cols-auto gap-4">
						<label for={id} class={labelClass}>{label}</label>
						<input id={id} class={inputClass} name={label.toLowerCase()} type="file" multiple />
					</div>
				)}
				<For each={["A", "B", "C"]}>{(value, _i, id = "check", name = "check") => (
					<div class="grid grid-cols-2 auto-cols-auto gap-4">
						<label for={[id, value].join("-")} class={labelClass}>{value}</label>
						<input id={[id, value].join("-")} class={inputClass} type="checkbox" name={name} value={value} />
					</div>
				)}</For>
				<input type="submit" class="border border-black rounded-full px-6 py-2 self-end">Submit</input>
			</form>
		</div>
	)
}

export default App
