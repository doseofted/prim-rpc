import type { ClientImaginaryProfile } from "@doseofted/prim-example"
import { Component, splitProps } from "solid-js"
import backend from "../client"

/** Helper to get entries from given the form as a record */
function formEntries<Expected>(form: HTMLFormElement) {
	const formData = new FormData(form)
	const data: Record<string, FormDataEntryValue> = {}
	formData.forEach((val, key) => data[key] = val)
	return data as unknown as Expected
}

/** A simple form item */
const FormItem: Component<{ id: string, type: string, label: string, autocomplete?: string, name: string }> = (props) => {
	// const [model] = createSignal("")
	const [given, misc] = splitProps(props, ["id", "label", "type"])
	return (
		<div class="flex items-center space-x-6">
			<label for={given.id} class="block w-32">{given.label}:</label>
			<input
				id={given.id}
				type={given.type}
				// value={model()}
				// onInput={(event) => setModel((event.target as HTMLInputElement).value)}
				class="border border-black rounded-full px-6 py-1 block w-full"
				{...misc}
			/>
		</div>
	)
}

// eslint-disable-next-line @typescript-eslint/require-await
async function formSubmit(event: Event & { currentTarget: HTMLFormElement }) {
	event.preventDefault()
	const entries = formEntries<ClientImaginaryProfile>(event.currentTarget)
	const profile = await backend.createImaginaryProfile(entries)
	console.log("Server response:", profile)
}

const App: Component = () => {
	return (
		<div class="w-full h-100vh flex items-center justify-center bg-black bg-gradient-to-b from-#00080d to-#082d41">
			<form class="w-full max-w-xl p-8 bg-white rounded-lg space-y-6 flex flex-col m-2" onSubmit={e => void formSubmit(e)}>
				<h1 class="text-xl font-bold">A Form</h1>
				<p>This is a form.</p>
				<FormItem id="name" name="name" label="Name" type="text" />
				<FormItem id="password" name="password" label="Password" type="password" autocomplete="new-password" />
				<FormItem id="email" name="email" label="Email" type="email" autocomplete="username" />
				<FormItem id="picture" name="picture" label="Picture" type="file" />
				<input type="submit" class="border border-black rounded-full px-6 py-2 self-end">Submit</input>
			</form>
		</div>
	)
}

export default App
