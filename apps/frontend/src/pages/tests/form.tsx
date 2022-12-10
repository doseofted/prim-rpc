import { useRef, useState } from "react"
import backend from "../../prim-client"

function Form() {
	const form = useRef<HTMLFormElement>(null)
	const [names, setNames] = useState<string[]>([])
	async function handleForm(form: HTMLFormElement) {
		try {
			const inputNames = await backend.handleForm(form)
			setNames(inputNames)
			form.reset()
		} catch (error) {
			console.log(error)
		}
	}
	return (
		<div className="w-full h-screen flex justify-center items-center bg-prim-space">
			<div className="flex flex-col gap-4 justify-center w-full max-w-md">
				<form
					className="bg-white rounded-lg p-8 grid grid-cols-2 gap-4"
					ref={form}
					onSubmit={event => {
						event.preventDefault()
						if (!form.current) {
							return
						}
						void handleForm(form.current)
					}}>
					<label>
						<span>Text</span>
						<input type="text" name="text" className="form-input w-full" />
					</label>
					<label>
						<span>Number</span>
						<input type="number" name="number" className="form-input w-full" min={0} max={100} step={1} />
					</label>
					<label className="col-span-2">
						<span>File(s)</span>
						<input type="file" multiple name="files" className="w-full" />
					</label>
					<div>
						{["A", "B", "C"].map(option => (
							<label key={option} className="col-span-2 flex gap-2 items-center">
								<input type="checkbox" name="checkbox" value={option} className="form-checkbox rounded-md" />
								<span>{option}</span>
							</label>
						))}
					</div>
					<input type="submit" value="Submit" className="form-input col-span-2" />
				</form>
				{names.length > 0 && (
					<div className="bg-white rounded-lg p-8 grid gap-1 grid-cols-1 prose">
						<p>Given form entries for:</p>
						<ul>
							{names.map((named, index) => (
								<li key={index}>{named}</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	)
}

export default Form
