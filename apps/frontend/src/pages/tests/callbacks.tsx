import { useRef, useState } from "react"
import backend from "../../client"

function Callbacks() {
	const [typed, setTyped] = useState<string>("")
	const form = useRef<HTMLFormElement>(null)
	const input = useRef<HTMLInputElement>(null)
	return (
		<div className="w-full h-screen flex justify-center items-center bg-prim-space">
			<div className="flex flex-col gap-4 justify-center w-[24rem]">
				<form
					ref={form}
					onSubmit={event => {
						event.preventDefault()
						if (!form.current || !input.current) {
							return
						}
						const data = new FormData(form.current)
						const message = data.get("message")?.toString() ?? ""
						setTyped(" ")
						input.current.value = ""
						void backend.typeMessage(message, letter => setTyped(typed => typed + letter), 50)
					}}>
					<input
						ref={input}
						type="text"
						name="message"
						className="form-input w-full"
						placeholder="type a message, press enter"
					/>
				</form>
				<div className="whitespace-nowrap text-ellipsis overflow-hidden form-input bg-white/50 text-black">
					{typed || "(typed message appears here)"}
				</div>
			</div>
		</div>
	)
}

export default Callbacks
